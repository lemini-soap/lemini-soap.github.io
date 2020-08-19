
// =============================================================================

const SOURCE_TABLE_FIELD = {
	id: 0
	,category: 1
	,name: 2
	,description: 3
	,calorie: 6
	,protein: 8
	,fat: 9
	,saturated_fat: 10
	,trans_fat: 0
	,carbohydrate: 12
	,sugar: 14
	,sodium: 21
};

// =============================================================================

const cnfOp = {
	Element: {
		get_id: function (id) {
			const Ele = document.getElementById(id);

			if (!Ele) console.log('id not exist: ' + id);
			return Ele;
		}
		,create: function (tag) {
			return document.createElement(tag.toUpperCase());
		}
		,get_node: function (fromEle, tag, cls) {
			const ns = fromEle.getElementsByTagName(tag.toUpperCase());
			let i;

			for (i=0; i<ns.length; i++) {
				if (-1 != ns[i].className.indexOf(cls)) return ns[i];
			}
			return null;
		}
	}
};

// =============================================================================

const cnfDatabase = {
	Items: []
	,init: function () {
		const rs = CNF_SOURCE_TABLE.text.replace(/\r/g, '').split("\n");
		let i;
		let fs;

		for (i=0; i<rs.length; i++) {
			fs = rs[i].split("\t");

			if (SOURCE_TABLE_FIELD.sodium >= fs.length) continue;
			if ('' == fs[SOURCE_TABLE_FIELD.id]) continue;
			if ('' == fs[SOURCE_TABLE_FIELD.name]) continue;

			this.Items[fs[SOURCE_TABLE_FIELD.id]] = {
				name: fs[SOURCE_TABLE_FIELD.name]
				,category: fs[SOURCE_TABLE_FIELD.category]
				,description: fs[SOURCE_TABLE_FIELD.description]
				,facts: [
					this.to_float(fs[SOURCE_TABLE_FIELD.calorie])
					,this.to_float(fs[SOURCE_TABLE_FIELD.protein])
					,this.to_float(fs[SOURCE_TABLE_FIELD.fat])
					,this.to_float(fs[SOURCE_TABLE_FIELD.saturated_fat])
					,0.0
					,this.to_float(fs[SOURCE_TABLE_FIELD.carbohydrate])
					,this.to_float(fs[SOURCE_TABLE_FIELD.sugar])
					,this.to_float(fs[SOURCE_TABLE_FIELD.sodium])
				]
			};
		}
	}
	,to_float: function (s) {
		let v = parseFloat(s);

		if (isNaN(v)) return 0.0;
		return (v / CNF_SOURCE_TABLE.copy);
	}
};

// =============================================================================

const cnfHeader = {
	init: function () {
		const _self = this;
		const E = cnfOp.Element;

		E.get_id('HEADER-TITLE').textContent = CNF_CONFIG.title;
		E.get_id('IMPORT-FILE').onclick = function () {
			_self.import();
		};
		E.get_id('EXPORT-FILE').onclick = function () {
			_self.export();
		};
	}
	,import: function () {
		const F = cnfOp.Element.get_id('OPEN-FILE');

		F.classList.remove('hidden');
		F.accept = '.calnf';

		F.onchange = function () {
			let FR;

			if (0 >= this.files.length) return;

			FR = new FileReader();
			FR.onload = function () {
				if (cnfIngredient.load(event.target.result)) {
					cnfTable.render();
				} else {
					alert('無法解析！');
				}
			};
			FR.readAsText(this.files[0])
		}
		F.click();

		F.classList.add('hidden');
	}
	,export: function () {
		const A = cnfOp.Element.get_id('DOWNLOAD-FILE');

		A.download = cnfIngredient.Data.product_name + '.calnf';
		A.href = 'Data:,' + JSON.stringify(cnfIngredient.Data);
		A.classList.remove('hidden');
		A.click();
		A.classList.add('hidden');
	}
};

// =============================================================================

const cnfIngredient = {
	storage_key: ''
	,Data: {}
	,init: function () {
		this.storage_key = CNF_CONFIG.app_id + '_INGREDIENTS';

		this.load(localStorage.getItem(this.storage_key));
	}
	,load: function (t) {
		let o;
		let i;

		this.reset_data();

		if ('string' !== typeof t) return false;
		if ('' == t) return false;
		if ('null' == t) return false;
		if (!(/^\{[\s\S]+\}$/.test(t))) return false;

		o = JSON.parse(t);
		if (o.hasOwnProperty('product_name')) this.Data.product_name = o.product_name;
		if (o.hasOwnProperty('copy_weight')) this.Data.copy_weight = o.copy_weight;
		if (o.hasOwnProperty('copies')) this.Data.copies = o.copies;

		if (!o.hasOwnProperty('Items')) return true;
		if (!Array.isArray(o.Items)) return true;
		for (i=0; i<o.Items.length; i++) {
			if (!o.Items[i].hasOwnProperty('id')) continue;
			if (!cnfDatabase.Items.hasOwnProperty(o.Items[i].id)) continue;

			this.load_item(o.Items[i]);
		}
		return true;
	}
	,load_item: function (item) {
		let r = {
			gram: 0
		};
		let k;

		for (k in r) {
			if (!item.hasOwnProperty(k)) continue;

			r[k] = item[k];
		}
		r.id = item.id;
		this.Data.Items.push(r);
	}
	,save: function () {
		localStorage.setItem(this.storage_key, JSON.stringify(this.Data));
	}
	,reset_data: function () {
		this.Data = {
			product_name: '未命名'
			,copy_weight: 100
			,copies: 1
			,Items: []
		};
	}
	,clear: function () {
		this.reset_data();
		this.save();
	}
	,insert: function (id) {
		this.Data.Items.push({
			id: id
			,gram: 0
		});
		this.save();
	}
	,update: function (ri, gram) {
		if (0 > ri) return;
		if (this.Data.Items.length <= ri) return;

		this.Data.Items[ri].gram = gram;
		this.save();
	}
	,remove: function (ri) {
		if (0 > ri) return;
		if (this.Data.Items.length <= ri) return;

		this.Data.Items.splice(ri, 1);
		this.save();
	}
	,update_field: function (fn, v) {
		this.Data[fn] = v;
		this.save();
	}
	,ret_calculated: function () {
		let RetV = {
			product_name: this.Data.product_name
			,copy_weight: parseFloat(this.Data.copy_weight)
			,copies: parseFloat(this.Data.copies)
			,total_weight: 0.0
			,Facts: {
				title: ['熱量','蛋白質','脂肪','　飽和脂肪','　反式脂肪','碳水化合物','　糖','鈉']
				,unit: ['大卡','公克','公克','公克','公克','公克','公克','毫克']
				,total: new Array(8).fill(0.0)
				,copy: new Array(8).fill(0.0)
				,one_hundred: new Array(8).fill(0.0)
			}
		};
		let i;
		let Item;
		let j;
		let gram;

		for (i=0; i<this.Data.Items.length; i++) {
			Item = this.Data.Items[i];
			gram = parseFloat(Item.gram);

			RetV.total_weight += gram;
			for (j=0; j<cnfDatabase.Items[Item.id].facts.length; j++){
				RetV.Facts.total[j] += (cnfDatabase.Items[Item.id].facts[j] * gram);
			}
		}
		if (0 >= RetV.total_weight) return RetV;

		for (i=0; i<RetV.Facts.total.length; i++) {
			RetV.Facts.copy[i] = (RetV.Facts.total[i] * RetV.copy_weight) / RetV.total_weight;
			RetV.Facts.one_hundred[i] = (RetV.Facts.total[i] * 100.0) / RetV.total_weight;
		}

		return RetV;
	}
};

// =============================================================================
// =============================================================================

const cnfTable = {
	Container: null
	,ProductName: null
	,CopyWeight: null
	,Copies: null
	,init: function () {
		const _self = this;
		const E = cnfOp.Element;

		this.Container = cnfOp.Element.get_id('ITEMS');
		this.ProductName = cnfOp.Element.get_id('PRODUCT-NAME');
		this.CopyWeight = cnfOp.Element.get_id('COPY-WEIGHT');
		this.Copies = cnfOp.Element.get_id('COPIES');

		E.get_id('CLEAR-ALL').onclick = function () {
			_self.clear();
		};
		E.get_id('SHOW-SEARCH-DIALOG').onclick = function () {
			cnfSearchDialog.show();
		};
		E.get_id('CALCULATE').onclick = function () {
			cnfTotalDialog.show();
		};
		this.ProductName.onblur = function () {
			cnfIngredient.update_field('product_name', this.value);
		};
		this.CopyWeight.onblur = function () {
			cnfIngredient.update_field('copy_weight', this.value);
		};
		this.Copies.onblur = function () {
			cnfIngredient.update_field('copies', this.value);
		};

		this.render();
	}
	,render: function () {
		let i = 0;

		this.ProductName.value = cnfIngredient.Data.product_name;
		this.CopyWeight.value = cnfIngredient.Data.copy_weight;
		this.Copies.value = cnfIngredient.Data.copies;

		this.Container.innerHTML = '';
		for (i=0; i<cnfIngredient.Data.Items.length; i++) {
			this.insert(cnfIngredient.Data.Items[i].id, cnfIngredient.Data.Items[i].gram);
		}
	}
	,insert: function (id, gram) {
		const _self = this;
		const E = cnfOp.Element;
		const div = E.create('DIV');
		let h = `
			<div class="delete"><span>X</span></div>
			<div class="no font-code">#{NO}</div>
			<div class="ingredient">{NAME}</div>
			<div class="gram"><input type="number" value="{GRAM}" min="0" /></div>
		`;

		h = h.replace(/\{ID\}/g, id);
		h = h.replace(/\{NO\}/g, this.Container.childNodes.length + 1);
		h = h.replace(/\{NAME\}/g, cnfDatabase.Items[id].name);
		h = h.replace(/\{GRAM\}/g, gram);
		div.classList.add('field-width');
		div.innerHTML = h;

		div.setAttribute('row-index', this.Container.childNodes.length);
		div.setAttribute('item-id', id);

		E.get_node(div, 'DIV', 'delete').firstChild.onclick = function () {
			const P = this.parentNode.parentNode;

			if (!confirm('移除 "'+ E.get_node(P, 'DIV', 'name').textContent +'" 嗎？')) return;

			cnfIngredient.remove(parseInt(P.getAttribute('row-index')));
			_self.render();
		};
		E.get_node(div, 'DIV', 'gram').firstChild.onblur = function () {
			const P = this.parentNode.parentNode;

			cnfIngredient.update(parseInt(P.getAttribute('row-index')), this.value);
		};

		this.Container.appendChild(div);
	}
	,clear: function () {
		if (!confirm('清空嗎？')) return;

		cnfIngredient.clear();
		this.render();
	}
};

// =============================================================================

const cnfTotalDialog = {
	Container: null
	,Table: null
	,init: function () {
		const E = cnfOp.Element;
		const _self = this;

		this.Container = E.get_id('TOTAL-DIALOG');
		this.Table = E.get_id('TOTAL-DIALOG-TABLE');

		E.get_id('TOTAL-DIALOG-CLOSE').onclick = function () {
			_self.Container.classList.add('hidden');
		};
		E.get_id('TOTAL-DIALOG-COPY').onclick = function () {
			_self.copy();
		};
		E.get_id('TOTAL-DIALOG-OK').onclick = function () {
			_self.Container.classList.add('hidden');
		};
	}
	,copy: function () {
		const T = cnfOp.Element.get_id('COPY-TEXT');

		T.value = this.ret_text();
		T.classList.remove('hidden');
		T.focus();
		T.select();
		document.execCommand("copy");
		T.classList.add('hidden');
	}
	,show: function () {
		this.Table.innerHTML = this.ret_table();
		this.Container.classList.remove('hidden');
	}
	,ret_table: function () {
		const V = cnfIngredient.ret_calculated();
		let h = `<div class="title bottom-border"><div>{PRODUCT_NAME}營養標示</div></div>
		<div class="copy-weight"><div>每一份量 <span class="font-code">{COPY_WEIGHT}</span> 公克</div></div>
		<div class="copies bottom-border"><div>本包裝含 <span class="font-code">{COPIES}</span> 份</div></div>
		<div class="field bottom-border">
			<div>每份</div>
			<div>每 <span class="font-code">100</span> 公克</div>
		</div>`;
		let i;

		h = h.replace(/\{PRODUCT_NAME\}/g, V.product_name);
		h = h.replace(/\{COPY_WEIGHT\}/g, V.copy_weight);
		h = h.replace(/\{COPIES\}/g, V.copies);
		for (i=0; i<V.Facts.title.length; i++) {
			h += this.ret_table_row(V.Facts.title[i], V.Facts.unit[i], V.Facts.copy[i], V.Facts.one_hundred[i]);
		}
		return h;
	}
	,ret_table_row: function (title, unit, copy, one_hundred) {
		let h = `<div class="row">
			<div>{TITLE}</div>
			<div><span class="font-code">{COPY}</span> {UNIT}</div>
			<div><span class="font-code">{ONE_HUNDRED}</span> {UNIT}</div>
		</div>`;

		copy = Math.round(copy * 10.0) / 10.0;
		one_hundred = Math.round(one_hundred * 10.0) / 10.0;

		h = h.replace(/\{TITLE\}/g, title);
		h = h.replace(/\{UNIT\}/g, unit);
		h = h.replace(/\{COPY\}/g, copy);
		h = h.replace(/\{ONE_HUNDRED\}/g, one_hundred);

		return h;
	}
	,ret_text: function () {
		const V = cnfIngredient.ret_calculated();
		let rs = [
			"{PRODUCT_NAME}營養標示"
			,"每一份量 {COPY_WEIGHT} 公克"
			,"本包裝含 {COPIES} 份"
			,"\t每份\t每 100 公克"
		];
		let i;

		rs[0] = rs[0].replace(/\{PRODUCT_NAME\}/g, V.product_name);
		rs[1] = rs[1].replace(/\{COPY_WEIGHT\}/g, V.copy_weight);
		rs[2] = rs[2].replace(/\{COPIES\}/g, V.copies);
		for (i=0; i<V.Facts.title.length; i++) {
			rs.push(this.ret_text_row(V.Facts.title[i], V.Facts.unit[i], V.Facts.copy[i], V.Facts.one_hundred[i]));
		}
		return rs.join("\n");
	}
	,ret_text_row: function (title, unit, copy, one_hundred) {
		let h = "{TITLE}\t{COPY} {UNIT}\t{ONE_HUNDRED} {UNIT}";

		copy = Math.round(copy * 10.0) / 10.0;
		one_hundred = Math.round(one_hundred * 10.0) / 10.0;

		h = h.replace(/\{TITLE\}/g, title);
		h = h.replace(/\{UNIT\}/g, unit);
		h = h.replace(/\{COPY\}/g, copy);
		h = h.replace(/\{ONE_HUNDRED\}/g, one_hundred);

		return h;
	}
};

// =============================================================================

const cnfSearchDialog = {
	Item: {
		Container: null
		,FoundRows: null
		,Rows: []
		,focus_index: -1
		,selected_id: ''
		,keyword: ''
		,init: function (Owner) {
			const E = cnfOp.Element;

			this.Owner = Owner;

			this.Container = E.get_id('SEARCH-DIALOG-FOUND-ITEMS');
			this.FoundRows = E.get_id('SEARCH-DIALOG-FOUND-ROWS');
		}
		,clear: function () {
			this.Container.innerHTML = '';
			this.FoundRows.textContent = '0 筆';
			this.Rows = [];
			this.focus_index = -1;
			this.selected_id = '';
		}
		,click: function (row_index, item_id) {
			if (this.Rows.length <= row_index) return;
			if (this.focus_index == row_index) return;

			if (-1 != this.focus_index) {
				this.Rows[this.focus_index].classList.remove('focus');
			}
			this.focus_index = row_index;
			this.Rows[this.focus_index].classList.add('focus');
			this.selected_id = item_id;
		}
		,search: function (keyword) {
			let k;
			let i = 0;
			let Item;

			this.clear();
			this.keyword = keyword;
			for (k in cnfDatabase.Items) {
				Item = cnfDatabase.Items[k];

				if (-1 == Item.name.indexOf(this.keyword)) {
					if (-1 == Item.description.indexOf(this.keyword)) {
						continue;
					}
				}

				this.insert(i, k, Item);
				i++;
			}
			this.FoundRows.textContent = this.Rows.length + ' 筆';
		}
		,insert: function (row_index, id, Item) {
			const _self = this;
			const div = cnfOp.Element.create('DIV');
			const R = new RegExp(this.keyword, 'g');
			const m = '<mark>' + this.keyword + '</mark>';
			let h = `
				<h4>{NAME}</h4>
				<p>{DESCRIPTION}</p>
			`;

			h = h.replace(/\{ID\}/g, id);
			h = h.replace(/\{NO\}/g, row_index + 1);
			h = h.replace(/\{NAME\}/g, Item.name.replace(R, m));
			h = h.replace(/\{DESCRIPTION\}/g, Item.description.replace(R, m));
			div.innerHTML = h;

			div.setAttribute('row-index', row_index);
			div.setAttribute('item-id', id);

			div.onclick = function () {
				_self.click(parseInt(this.getAttribute('row-index')), this.getAttribute('item-id'));
			};

			this.Container.appendChild(div);
			this.Rows.push(div);
		}
	}

	// -----------------------------------------------------

	,Container: null
	,Keyword: null
	,Search: null
	,init: function () {
		const E = cnfOp.Element;
		const _self = this;

		this.Container = E.get_id('SEARCH-DIALOG');
		this.Keyword = E.get_id('SEARCH-DIALOG-KEYWORD');
		this.Search = E.get_id('SEARCH-DIALOG-SEARCH');
		this.Item.init(this);

		this.Keyword.onkeyup = function () {
			if (13 != event.keyCode) return;
			
			_self.Search.focus();
			_self.search_word();
		};
		this.Search.onclick = function () {
			_self.search_word();
		};

		E.get_id('SEARCH-DIALOG-CLOSE').onclick = function () {
			_self.Container.classList.add('hidden');
		};
		E.get_id('SEARCH-DIALOG-CANCEL').onclick = function () {
			_self.cancel();
		};
		E.get_id('SEARCH-DIALOG-OK').onclick = function () {
			_self.ok();
		};
	}
	,show: function () {
		this.Item.clear();
		this.Container.classList.remove('hidden');
		this.Keyword.focus();
	}
	,search_word: function () {
		if ('' == this.Keyword.value) return;

		this.Item.search(this.Keyword.value);
	}
	,cancel: function () {
		this.Container.classList.add('hidden');
	}
	,ok: function () {
		this.Container.classList.add('hidden');
		if ('' == this.Item.selected_id) return;

		cnfIngredient.insert(this.Item.selected_id);
		cnfTable.insert(this.Item.selected_id, 0);
	}
};

// =============================================================================

window.addEventListener('load', function () {
	cnfDatabase.init();
	cnfHeader.init();
	cnfIngredient.init();
	cnfTable.init();

	cnfSearchDialog.init();
	cnfTotalDialog.init();

	//cnfIngredient.save();
});

// =============================================================================
