var host = ""

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
FamilyManager.prototype.members = function (familyId, options) {
    this.opts = $.extend(this.opts, options);

    var sm = new StatementManager();
    if (this.opts.reflesh) sm.flush('', '', Person.Properties.SuoZaiJiaZu, familyId);
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
    var cm = new ConceptManager();
    return cm.get(familyId);
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
    var dtd = $.Deferred();

    var personId = this.personId;
    var sm = new StatementManager();
    sm.findBySP(this.personId, Nagu.MType.Concept, Person.Properties.Gender).done(function (fss) {
        if (fss.length && fss[0].Object.ConceptId == Person.GenderType.Female)
            sm.findByPO(Person.Properties.HasMother, personId, Nagu.MType.Concept).done(function (data) {
                dtd.resolve(data);
            });
        else
            sm.findByPO(Person.Properties.HasFather, personId, Nagu.MType.Concept).done(function (data) {
                dtd.resolve(data);
            });
    });
    return dtd.promise();

};
Person.prototype.create = function (fn, desc) {
    var dtd = $.Deferred();

    var cm = new ConceptManager();
    cm.create(fn, desc).done(function (person) {
        cm.addRdfType(person.ConceptId, Person.JiazuChengyuanType).done(function (typeFs) {
            dtd.resolve(person, typeFs);
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


/******* CreatePersonDialog 类 ******************************************************************************************************************/

function CreatePersonDialog(options) {
    var defaults = {
        host: "",
        appId: "00000000-0000-0000-0000-000000000000",
        templateUrl: "/Apps/jiapu/dialog/createPerson.html",
        dialogId: "dlgCreatePerson_" + randomInt(),
        autoInit: true,
        h3: '创建新家族成员',
        added: function (concept) { consle.log('new concept::::::::::' + concept.FriendlyNames[0]); }

    };
    // Extend our default options with those provided.    
    this.opts = $.extend(defaults, options);
    CreatePersonDialog.prototype.added = this.opts.added;
    if (this.opts.autoInit) this.init();
};

CreatePersonDialog.prototype.added = function (person) { };


CreatePersonDialog.prototype.init = function () {
    var dialogId = this.opts.dialogId;
    return $.get(this.opts.templateUrl).done(function (html) {
        html = html.replace(/{dlgCreatePerson}/g, dialogId);
        $('body').append(html);
    });
};

CreatePersonDialog.prototype.toggle = function (familyId, personId, options) {
    // Extend our default options with those provided.
    this.opts = $.extend(this.opts, options);

    var div = $('#' + this.opts.dialogId);
    div.find('.alert').hide();
    div.attr('personId', personId);
    div.attr('appId', this.opts.appId);

    if (familyId === undefined) {
        alert('未指定家族ID');
        return false;
    }
    div.attr('familyId', familyId);

    var fm = new FamilyManager();
    fm.get(familyId).done(function (family) {
        div.find('#tbFamilyName').val(family.FriendlyNames[0]);
    });

    div.find('h3').text(this.opts.h3);
    div.modal('toggle');
};

CreatePersonDialog.prototype.hide = function () {
    $('#' + this.opts.dialogId).modal('hide');
}





/******** 各种回调函数 ************************************************************************************************************************/

function person_conceptList_renderItem(concept, li) {
    // 显示家族树成员的算法见 #1
    var personId = concept.ConceptId;

    // 删除家族树中已经存在的成员节点
    $($.grep($('#genTree2 li'), function (li) {
        return $(li).attr('personId') == personId;
    })).remove();
    li.attr('personId', personId);
    li.append(loadingImg());

    var cm = new ConceptManager();
    cm.get(personId).done(function (person) {
        // 下拉菜单
        // “详细信息”菜单
        var miDetail = new MenuItem({
            appended: function (li, a) {
                a.attr('href', '/apps/jiapu/person.html?id=' + personId);
            },
            text: '详细信息'
        });

        // “显示家族关系”菜单
        var miGen = new MenuItem({
            text: '显示家族关系',
            appended: function (li, a) {
                a.click(function () {
                    // 1. 显示"父亲"

                    var pm = new Person(personId);
                    pm.father().done(function (data) {
                        // 获取世代容器
                        var fatherLi = li.closest('.gen-li').prev();

                        // 如果存在父亲
                        if (data.length) {
                            // 世代容器不存在，则创建世代容器
                            if (fatherLi.size() == 0) {
                                var newli = newLi().attr("id", "gen" + randomInt()).addClass("gen-li");
                                fatherLi = li.closest('.gen-li').before(newli).prev();
                                fatherLi.append(newTag('ul', { class: 'nav nav-pills' }));
                            }

                            $.each(data, function (i, fatherFss) {
                                var father = fatherFss.Object;
                                var li = newLi().attr("conceptId", father.ConceptId);
                                fatherLi.find('ul.nav').append(li);
                                person_conceptList_renderItem(father, li);
                            });

                            //                            var fathers = new Array();
                            //                            $.each(data, function (i, n) {
                            //                                fathers.push(n.Object);
                            //                            });
                            //                            fatherLi.find('ul.nav').conceptList(fathers, {
                            //                                renderItem: person_conceptList_renderItem
                            //                            });
                        }
                    });

                    // 2. 显示子女
                    pm.children().done(function (data) {
                        // 获取世代容器
                        var chilrenLi = li.closest('.gen-li').next();
                        // 如果存在子女:
                        if (data.length) {
                            // 如果世代容器不存在，则创建世代容器
                            if (chilrenLi.size() == 0) {
                                var newli = newLi().attr("id", "gen" + randomInt()).addClass("gen-li");
                                chilrenLi = li.closest('.gen-li').after(newli).next();
                                chilrenLi.append(newTag('ul', { class: 'nav nav-pills' }));
                            }


                            $.each(data, function (i, childFss) {
                                var child = childFss.Subject;
                                var li = newLi().attr("conceptId", child.ConceptId);
                                chilrenLi.find('ul.nav').append(li);
                                person_conceptList_renderItem(child, li);
                            });
                            //                            var children = new Array();
                            //                            $.each(data, function (i, n) {
                            //                                children.push(n.Subject);
                            //                            });
                            //                            chilrenLi.find('ul.nav').conceptList(children, {
                            //                                renderItem: person_conceptList_renderItem
                            //                            });
                        }
                    });
                    $(this).remove();
                });
            }
        });


        var menuId = 'menu' + randomInt();
        li.empty().addClass('dropdown').attr('id', menuId).conceptMenu([miDetail, miGen], {
            text: person.FriendlyNames[0],
            rendered: function (ph, toggler, ul) {
                toggler.prepend(Icon('icon-user'));
            }
        });
    });
}
