
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

const cnfStorage = {
	storage_key: ''
	,Ids: {}
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
		cnfResult.refresh();

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
		this.Ids[item.id] = true;
		this.Data.Items.push(r);
	}
	,save: function () {
		localStorage.setItem(this.storage_key, JSON.stringify(this.Data));
	}
	,reset_data: function () {
		this.Ids = {};
		this.Data = {
			product_name: '未命名'
			,copy_weight: 100
			,copies: 1
			,Items: []
		};
	}
	,reset: function () {
		this.reset_data();
		this.save();
		cnfResult.refresh();
	}
	,is_has_id: function (id) {
		return this.Ids.hasOwnProperty(id);
	}
	,insert: function (id) {
		this.Ids[id] = true;
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
		cnfResult.refresh();
	}
	,remove: function (ri) {
		if (0 > ri) return;
		if (this.Data.Items.length <= ri) return;

		delete this.Ids[this.Data.Items[ri].id];
		this.Data.Items.splice(ri, 1);
		this.save();
		cnfResult.refresh();
	}
	,update_field: function (fn, v) {
		this.Data[fn] = v;
		this.save();
		cnfResult.refresh();
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

const cnfHeader = {
	init: function () {
		const E = cnfOp.Element;

		document.title = CNF_CONFIG.title;

		E.get_id('HEADER-TITLE').textContent = CNF_CONFIG.title;
		E.get_id('HEADER-SHOW-ABOUT-DIALOG').onclick = function () {
			E.get_id('__panel_about').style.display = 'block';
		};
	}
};

// =============================================================================

const cnfConfig = {
	ProductName: null
	,CopyWeight: null
	,Copies: null
	,init: function () {
		const _self = this;
		const E = cnfOp.Element;

		this.ProductName = E.get_id('CONFIG-PRODUCT-NAME');
		this.CopyWeight = E.get_id('CONFIG-COPY-WEIGHT');
		this.Copies = E.get_id('CONFIG-COPIES');

		this.ProductName.onblur = function () {
			cnfStorage.update_field('product_name', this.value);
		};
		this.CopyWeight.onblur = function () {
			cnfStorage.update_field('copy_weight', this.value);
		};
		this.Copies.onblur = function () {
			cnfStorage.update_field('copies', this.value);
		};

		this.ProductName.onkeyup = function () {
			if (13 != event.keyCode) return;
			this.blur();
		};
		this.CopyWeight.onkeyup = function () {
			if (13 != event.keyCode) return;
			this.blur();
		};
		this.Copies.onkeyup = function () {
			if (13 != event.keyCode) return;
			this.blur();
		};

		this.render();
	}
	,render: function () {
		this.ProductName.value = cnfStorage.Data.product_name;
		this.CopyWeight.value = cnfStorage.Data.copy_weight;
		this.Copies.value = cnfStorage.Data.copies;
	}
};

// =============================================================================

const cnfSearch = {
	Keyword: null
	,Action: null
	,init: function () {
		const E = cnfOp.Element;
		const _self = this;

		this.Keyword = E.get_id('SEARCH-KEYWORD');
		this.Action = E.get_id('SEARCH-ACTION');
		this.List.init(this);

		this.Keyword.onkeyup = function () {
			if (13 != event.keyCode) return;
			
			_self.Action.focus();
			_self.search_word();
		};
		this.Action.onclick = function () {
			_self.search_word();
		};

		E.get_id('SEARCH-APPEND').onclick = function () {
			_self.append();
		};
	}
	,search_word: function () {
		if ('' == this.Keyword.value) {
			this.Keyword.focus();
			return;
		}
		this.List.search(this.Keyword.value);
	}
	,append: function () {
		if (-1 == this.List.focus_index) {
			this.Keyword.focus();
			return;
		}
		cnfStorage.insert(this.List.selected_id);
		cnfIngredient.List.insert(this.List.selected_id, 0);
		if (!cnfMobile.is_yes()) {
			cnfIngredient.List.highlight_last_row();
		}
		this.List.set_focus_row_used();
	}
	,highlight_input: function () {
		const P = this.Keyword.parentNode.parentNode;

		this.Keyword.focus();
		P.classList.add('highlight');
		setTimeout(function () {
			P.classList.remove('highlight');
		}, 250);
	}

	// -----------------------------------------------------

	,List: {
		Container: null
		,Tpl: null
		,Count: null
		,Rows: []
		,focus_index: -1
		,selected_id: ''
		,keyword: ''
		,init: function (Owner) {
			const E = cnfOp.Element;

			this.Owner = Owner;

			this.Container = E.get_id('SEARCH-LIST');
			this.Tpl = E.get_id(this.Container.getAttribute('data-template-item'));
			this.Count = E.get_id('SEARCH-COUNT');
		}
		,clear: function () {
			this.Container.innerHTML = '';
			this.Count.textContent = '';
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
			if (0 < this.Rows.length) this.Count.textContent = '(' + this.Rows.length + ') ';
		}
		,insert: function (row_index, id, Item) {
			const _self = this;
			const R = new RegExp(this.keyword, 'g');
			const m = '<mark>' + this.keyword + '</mark>';
			const div = cnfOp.Element.create(this.Tpl.getAttribute('data-element'));
			let h = this.Tpl.innerHTML;

			h = h.replace(/\{ID\}/g, id);
			h = h.replace(/\{NO\}/g, row_index + 1);
			h = h.replace(/\{NAME\}/g, Item.name.replace(R, m));
			h = h.replace(/\{DESCRIPTION\}/g, Item.description.replace(R, m));
			div.innerHTML = h;
			div.className = this.Tpl.getAttribute('data-class');

			div.setAttribute('data-row-index', row_index);
			div.setAttribute('data-item-id', id);
			if (cnfStorage.is_has_id(id)) div.classList.add('used');

			div.onclick = function () {
				_self.click(parseInt(this.getAttribute('data-row-index')), this.getAttribute('data-item-id'));
			};

			this.Container.appendChild(div);
			this.Rows.push(div);
		}
		,set_focus_row_used: function () {
			if (-1 == this.focus_index) return;

			this.Rows[this.focus_index].classList.add('used');
		}
	}
};

// =============================================================================

const cnfIngredient = {
	Container: null
	,init: function () {
		const _self = this;
		const E = cnfOp.Element;

		this.List.init(this);

		E.get_id('INGREDIENT-NEW').onclick = function () {
			_self.new(this);
		};
		E.get_id('INGREDIENT-IMPORT').onclick = function () {
			_self.import();
		};
		E.get_id('INGREDIENT-EXPORT').onclick = function () {
			_self.export();
		};
		E.get_id('INGREDIENT-RESET').onclick = function () {
			if (!confirm('重置嗎？')) return;

			cnfStorage.reset();
			cnfConfig.render();
			_self.List.render();
		};
	
		this.List.render();
	}
	,new: function (Btn) {
		if (cnfMobile.is_yes()) cnfMobile.TabCtrl.change_to('search');
		cnfSearch.highlight_input();
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
				if (cnfStorage.load(event.target.result)) {
					cnfStorage.save();
					cnfConfig.render();
					cnfIngredient.List.render();
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

		A.download = cnfStorage.Data.product_name + '.calnf';
		A.href = 'Data:,' + JSON.stringify(cnfStorage.Data);
		A.classList.remove('hidden');
		A.click();
		A.classList.add('hidden');
	}

	// -----------------------------------------------------

	,List: {
		Container: null
		,Tpl: null
		,init: function (Owner) {
			const E = cnfOp.Element;

			this.Owner = Owner;

			this.Container = E.get_id('INGREDIENT-LIST');
			this.Tpl = E.get_id(this.Container.getAttribute('data-template-item'));
		}
		,render: function () {
			let i = 0;
	
			this.Container.innerHTML = '';
			for (i=0; i<cnfStorage.Data.Items.length; i++) {
				this.insert(cnfStorage.Data.Items[i].id, cnfStorage.Data.Items[i].gram);
			}
		}
		,insert: function (id, gram) {
			const _self = this;
			const E = cnfOp.Element;
			const div = E.create(this.Tpl.getAttribute('data-element'));
			let h = this.Tpl.innerHTML;
			let G;
	
			h = h.replace(/\{ID\}/g, id);
			h = h.replace(/\{NO\}/g, this.Container.childNodes.length + 1);
			h = h.replace(/\{NAME\}/g, cnfDatabase.Items[id].name);
			h = h.replace(/\{GRAM\}/g, gram);
			div.innerHTML = h;
			div.className = this.Tpl.getAttribute('data-class');
	
			div.setAttribute('data-row-index', this.Container.childNodes.length);
			div.setAttribute('data-item-id', id);
	
			E.get_node(div, 'DIV', 'delete').firstChild.onclick = function () {
				const P = this.parentNode.parentNode;
	
				if (!confirm('移除 "'+ E.get_node(P, 'DIV', 'name').textContent +'" 嗎？')) return;
	
				cnfStorage.remove(parseInt(P.getAttribute('data-row-index')));
				_self.render();
			};
			G = E.get_node(div, 'DIV', 'gram').firstChild;
			G.onblur = function () {
				const P = this.parentNode.parentNode;
	
				cnfStorage.update(parseInt(P.getAttribute('data-row-index')), this.value);
			};
			G.onkeyup = function () {
				if (13 != event.keyCode) return;
				
				this.blur();
			};
	
			this.Container.appendChild(div);
		}
		,highlight_last_row: function () {
			const Chs = this.Container.childNodes;
			let E;
	
			if (0 >= Chs.length) return;
	
			E = Chs[Chs.length - 1];
			E.classList.add('highlight');
			setTimeout(function () {
				E.classList.remove('highlight');
			}, 250);
		}
	}
};

// =============================================================================

const cnfResult = {
	ProductName: null
	,Table: null
	,Tpl: {
		info_title: ''
		,info_item: ''
	}
	,init: function () {
		const E = cnfOp.Element;
		const _self = this;

		this.ProductName = E.get_id('RESULT-PRODUCT-NAME');
		this.Table = E.get_id('RESULT-TABLE');
		this.Tpl.info_title = E.get_id(this.Table.getAttribute('data-template-title')).innerHTML;
		this.Tpl.info_item = E.get_id(this.Table.getAttribute('data-template-item')).innerHTML;

		E.get_id('RESULT-COPY').onclick = function () {
			_self.copy();
		};
	}
	,refresh: function () {
		this.ProductName.textContent = cnfStorage.Data.product_name;
		this.Table.innerHTML = this.parse(
			this.Tpl.info_title
			,this.Tpl.info_item
		);
	}
	,copy: function () {
		const T = cnfOp.Element.get_id('COPY-TEXT');

		T.value = this.parse(
			"{PRODUCT_NAME}\n\n營養標示\n每一份量 {COPY_WEIGHT} 公克\n本包裝含 {COPIES} 份\n\t每份\t每 100 公克"
			,"\n{TITLE}\t{COPY} {UNIT}\t{ONE_HUNDRED} {UNIT}"
		);
		T.classList.remove('hidden');
		T.focus();
		T.select();
		document.execCommand("copy");
		T.classList.add('hidden');
		alert('複製完成！');
	}
	,parse: function (h, l) {
		const V = cnfStorage.ret_calculated();

		h = h.replace(/\{PRODUCT_NAME\}/g, V.product_name);
		h = h.replace(/\{COPY_WEIGHT\}/g, V.copy_weight);
		h = h.replace(/\{COPIES\}/g, V.copies);

		for (i=0; i<V.Facts.title.length; i++) {
			h += this.parse_row(l, V.Facts.title[i], V.Facts.unit[i], V.Facts.copy[i], V.Facts.one_hundred[i]);
		}
		return h;
	}
	,parse_row: function (h, title, unit, copy, one_hundred) {
		const c = Math.round(copy * 10.0) / 10.0;
		const oh = Math.round(one_hundred * 10.0) / 10.0;

		h = h.replace(/\{TITLE\}/g, title);
		h = h.replace(/\{UNIT\}/g, unit);
		h = h.replace(/\{COPY\}/g, c);
		h = h.replace(/\{ONE_HUNDRED\}/g, oh);

		return h;
	}
};

// =============================================================================

const cnfAbout = {
	Container: null
	,Tpl: null
	,init: function () {
		const E = cnfOp.Element;

		this.Container = E.get_id('ABOUT-CONTENT');
		this.Tpl = E.get_id(this.Container.getAttribute('data-template-item'));

		this.render();
	}
	,render: function () {
		let h = this.Tpl.innerHTML;

		h = h.replace(/\{DATABASE_OWNER\}/g, CNF_SOURCE_TABLE.owner);
		h = h.replace(/\{DATABASE_HOMEPAGE\}/g, CNF_SOURCE_TABLE.homepage);
		h = h.replace(/\{DATABASE_VERSION\}/g, CNF_SOURCE_TABLE.version);
		h = h.replace(/\{DATABASE_URL\}/g, CNF_SOURCE_TABLE.url);

		this.Container.innerHTML = h;
	}
}

// =============================================================================

const cnfMobile = {
	CheckElement: null
	,init: function () {
		const _self = this;
		const E = cnfOp.Element;

		this.TabCtrl.init(this);

		this.CheckElement = E.get_id('MOBILE-CHECK-ELEMENT');

		setTimeout(function () {
			const md = E.get_id('MOBILE-DASHBOARD');

			if (!_self.is_yes()) return;

			md.style.height = window.innerHeight + 'px';
		}, 250);
	}
	,is_yes: function () {
		return ('none' != getComputedStyle(this.CheckElement, '').getPropertyValue('display'));
	}

	// -----------------------------------------------------

	,TabCtrl: {
		Container: null
		,Buttons: []
		,Panels: []
		,tab_id_to_row: {}
		,focus_index: -1
		,init: function (Owner) {
			const E = cnfOp.Element;

			this.Owner= Owner;

			this.Container = E.get_id('MOBILE-TAB-CONTROL');	

			this.load_buttons();
		}
		,load_buttons: function () {
			const _self = this;
			const E = cnfOp.Element;
			const Chds = this.Container.childNodes;
			let i;

			for (i=0; i<Chds.length; i++) {
				if ('DIV' != Chds[i].nodeName) continue;

				Chds[i].setAttribute('data-row-index', this.Panels.length);
				if (Chds[i].hasAttribute('data-default-focus')) this.focus_index = this.Panels.length;

				Chds[i].onclick = function () {
					_self.click(parseInt(this.getAttribute('data-row-index')));
				};

				this.tab_id_to_row[Chds[i].getAttribute('data-tab-id')] = this.Buttons.length;
				this.Buttons.push(Chds[i]);
				this.Panels.push(E.get_id(Chds[i].getAttribute('data-panel')));
			}
			if (-1 !== this.focus_index) {
				this.Buttons[this.focus_index].classList.add('focus');
				this.Panels[this.focus_index].classList.add('focus');
			}
		}
		,click: function (row_index) {
			if (this.Buttons.length <= row_index) return;
			if (this.focus_index == row_index) return;

			if (-1 != this.focus_index) {
				this.Buttons[this.focus_index].classList.remove('focus');
				this.Panels[this.focus_index].classList.remove('focus');
			}
			this.focus_index = row_index;
			this.Buttons[this.focus_index].classList.add('focus');
			this.Panels[this.focus_index].classList.add('focus');
		}
		,change_to: function (id) {
			if (!this.tab_id_to_row.hasOwnProperty(id)) return;

			this.click(this.tab_id_to_row[id]);
		}
	}
};

// =============================================================================

window.addEventListener('load', function () {
	cnfDatabase.init();
	cnfMobile.init();

	cnfHeader.init();
	cnfResult.init();
	cnfStorage.init();
	cnfConfig.init();
	cnfSearch.init();
	cnfIngredient.init();
	cnfAbout.init();
});

// =============================================================================
