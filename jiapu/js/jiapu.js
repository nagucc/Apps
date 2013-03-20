﻿var host = ""

function FamilyManager(options) {
    var defaults = {
        reflesh: false // 是否每次读取数据都强制刷新缓存.
    };
    // Extend our default options with those provided.    
    this.opts = $.extend(defaults, options);
}
FamilyManager.JiazuType = "796fb149-fd45-48af-92da-6a5aad1b1cbf";

FamilyManager.prototype.all = function (options) {
    this.opts = $.extend(this.opts, options);

    var sm = new StatementManager();
    if (this.opts.reflesh) { // 如果需要强制刷新,则先清空缓存数据.
        console.log('清空Family.all缓存');
        sm.flush('', '', Nagu.Concepts.RdfType, FamilyManager.JiazuType);
    }

    return sm.findByPO(Nagu.Concepts.RdfType, FamilyManager.JiazuType, Nagu.MType.Concept);
};
FamilyManager.prototype.members = function (familyId) {
    var sm = new StatementManager();
    return sm.findByPO(Person.Properties.SuoZaiJiaZu, familyId, Nagu.MType.Concept);
};
FamilyManager.prototype.create = function (fn, desc) {
    var dtd = $.Deferred();
    var cm = new ConceptManager();

    // 创建指定家族的Concept
    cm.create(fn, desc).done(function (concept) {
        console.log("创建家族Concept成功");
        // 添加“家族”类型：
        cm.addRdfType(concept.ConceptId, Nagu.MType.Concept, FamilyManager.JiazuType).done(function (fs) {
            console.log("添加家族 RdfType 成功");
            dtd.resolve(concept, fs);
            // 添加say状态：
            var sm = new SayManager();
            sm.say(fs.StatementId)
        });
    }).fail(function () { alert("FamilyManager.create失败"); dtd.reject(); });
    return dtd.promise();
};

FamilyManager.prototype.get = function (familyId) {
    var sm = new StatementManager();
}


/********************************************************************************************************************************/

function Person(personId) { this.personId = personId; }
Person.JiazuChengyuanType = "d419ca8c-257f-4830-96b8-324e51a1d15b";
Person.Properties = {
    HasFather: "6235da69-f802-4e4c-8eab-866bf1daf653",  // "父亲"谓词的ID：
    HasMother: "762ee3bd-f14b-4253-a05e-d9b6782911c3",  // “母亲”谓词的ID
    Gender: "6edc6734-4d59-4f97-a877-87a58777f45a",     // “性别”谓词的Id
    BirthYear: "9ed1afef-a804-417c-a528-3d27d457db17",  // “出生年份”谓词的ID
    SuoZaiJiaZu: "65299f7f-18a5-403a-a555-3dc726749991" // “所在家族”谓词的ID
};
Person.GenderType = {
    Male: "96dd894c-a6da-4562-b9e9-f85fcca96463",
    Female: "abcc829a-0a02-412b-9dc4-3ed259b1894a"
};

/********************************************************
成员信息缓存
Person.Cache[personId]["children"]: 家族成员的子女列表
********************************************************/
//Person.Cache = new Array();


Person.prototype.get = function () {
    var cm = new ConceptManager();
    return cm.get(this.personId);
};

Person.prototype.father = function () {
    var sm = new StatementManager();
    return sm.findBySP(this.personId, Nagu.MType.Concept, Person.Properties.HasFather);
};

/********************************************
获取家族成员的子女信息
*********************************************/
Person.prototype.children = function () {
    var personId = this.personId;
    var sm = new StatementManager();
    return sm.findBySP(this.personId, Nagu.MType.Concept, Person.Properties.Gender).done(function (fss) {
        
        if (fss.length && fss[0].Object.ConceptId == Person.GenderType.Female)
            return sm.findByPO(Person.Properties.HasMother, personId, Nagu.MType.Concept);
        else
            return sm.findByPO(Person.Properties.HasFather, personId, Nagu.MType.Concept);
    });
};
Person.prototype.create = function (fn, desc) {
    var dtd = $.Deferred();

    var cm = new ConceptManager();
    cm.create(fn, desc).done(function (person) {
        cm.addRdfType(person.ConceptId, Nagu.MType.Concept, Person.JiazuChengyuanType).done(function (typeFs) {
            dtd.resovle(person, typeFs);
        });
    });
    return dtd.promise();
};

Person.prototype.memberProperties = function () {
    return propertyValuesFormBaseClass(this.personId, Nagu.MType.Concept, Person.JiazuChengyuanType)
};



/********************************************************************************************************************************/
function renderPersonBtnGroup2(btngroup, name, personId, onMenuCreating) {
    btngroup.attr("personId", personId);
    // 生成按钮
    var button = newABtn(name).prepend(UserIcon());
    button.addClass("dropdown-toggle").attr("data-toggle", "dropdown");

    // 下拉菜单
    var dmenu;
    if (onMenuCreating == null) {
        dmenu = newDropdownMenu(function (menu) {
            renderPersonBtnMenu(menu, personId);
        });
    }
    else {
        dmenu = newDropdownMenu(function (menu) {
            onMenuCreating(menu, personId);
        });
    }


    // 生成 btn-group
    btngroup.append(button).append(dmenu);

    return btngroup;


}

function renderPersonBtnMenu(menu, personId) {
    // “详细信息”菜单
    var miDetail = new MenuItem({
        appended: function (li, a) {
            a.attr('href', 'person.html?id=' + personId);
        },
        text: '详细信息'
    });

    // “显示家族关系”菜单
    var miGen = new MenuItem({
        text: '显示家族关系',
        appended: function (li, a) {
            a.click(function () {
                showFather(personId, menu.closest("li").attr("id"));
                showChildren(personId, menu.closest("li").attr("id"));
                $(this).remove();
            });
        }
    });

    miDetail.appendTo(menu);
    miGen.appendTo(menu);

    // 分隔符
    menu.append(newLi().addClass("divider"));
}