var curUser, curConcept;
var host = "";
var addTypeDialog, addValueDialog, createConceptDialog, cdp,  dlgSearchDialog, dlgArticleShow;
var dlgLogin, dlgSelectDialog;

// 全局变量
var renderValues;


$(function () {
    curConcept = getRequest()['id'];
    if (curConcept === undefined || curConcept == '') return;

    var mode = getRequest()['mode'];
    if (mode == 'debug') $('#divDebug').show();

    

    dlgArticleShow = new ArticleShowDialog();
    dlgSearchDialog = new SearchConceptDialog();

    // 此处取消注释会出错，原因？
    //dlgSelectDialog = new SelectConceptDialog();

    showConcept();
    
    

    // 检查用户是否已登录
    Nagu.MM.getMe().done(function (me) {
        if (me.ret == 0) { // 已登录
            afterNaguLogin(me);
        } else { // 未登录
            naguLogout();
        }
    })

    // 显示二维码
    try {
        $('.qrcode').show();
        $("#qrcode").qrcode({
            width: 150,
            height: 150,
            text: window.location.href
        });
    } catch (e) { }

    $('#btnClearStorage').btnCleanStorage();

});


function showConcept() {
    // 获取Concept信息,显示与登录无关的信息
    Nagu.CM.get(curConcept).done(function (concept) {
        $('#fn').text(concept.FriendlyNames[0]);
        $('title').text(concept.FriendlyNames[0] + ' - 纳谷概念云');
        $('.brand').text(concept.FriendlyNames[0]);
        $('#desc').text(concept.Descriptions[0]);

        // 显示类型下拉列表
        var ul = $('#typeMenu');
        $.each(concept.TypeFss, function (i, typeFs) {
            if (typeFs.Object.ConceptId == Nagu.Concepts.NaguConcept) return;
            if (ul.find('li.' + typeFs.StatementId).size() > 0) return;
            var li = $('<li/>').addClass(typeFs.StatementId).appendTo(ul);
            var a = $('<a/>').attr('data-toggle', 'tab');
            a.append($('<i></i>').addClass('icon-th-large')).appendTo(li);

            var divPane = $('<div/>').addClass('tab-pane').appendTo($('.tab-content'));
            Nagu.CM.get(typeFs.Object.ConceptId).done(function (type) {
                a.attr('href', '#type-pane-' + type.ConceptId).append(type.FriendlyNames[0]);
                divPane.attr('id', 'type-pane-' + type.ConceptId);

                // 显示相关类型的属性及值
                divPane.conceptType(typeFs);
            });
        });



        // 初始化本地存储信息：
        var days = 0, hours = 0, minutes = 0, seconds = 0;
        var text = '';
        var ttl = Math.floor($.jStorage.getTTL('concept_' + curConcept) / 1000);
        days = Math.floor(ttl / 86400);
        ttl -= days * 86400;

        hours = Math.floor(ttl / 3600);
        ttl -= hours * 3600;

        minutes = Math.floor(ttl / 60);
        ttl -= minutes * 60;

        seconds = ttl;

        if (days > 0) text += days + '天';
        if (hours > 0 || text != '') text += hours + '小时';
        if (minutes > 0 || text != '') text += minutes + '分';
        if (seconds > 0 || text != '') text += seconds + '秒';
        $('#ttlText').text(text);

        $('#btnFlushConcept').attr('data-original-title', '当前Concept正在本地存储，' + text + '之后过期，您也可以现在立即刷新');
        $('#btnFlushConcept').tooltip({
            html: true
        });
    });

}

/********************************************************************************************************************************/
// 当nagu未登录或用户退出之后
function naguLogout() {
    $('.nagu-logged').hide();
    $('.nagu-logout').show();

    if (dlgLogin === undefined) {
        dlgLogin = new LoginDialog({
            success: function (me) {
            }
        });
    }


    $('#info').conceptShow(curConcept);
    $('#properties').conceptProperties(curConcept);
}



function logout() {
    Nagu.MM.logout().done(function () {
        naguLogout();
    });
}

// 当nagu登录成功之后
function afterNaguLogin(me) {

    // 初始化“添加/删除收藏”按钮
    //$('#btnFavorite').btnFavorite(curConcept);

    // 初始化对话框:
    if (createConceptDialog === undefined) {
        createConceptDialog = new CreateConceptDialog({
            onAdded: createConceptDialog_onUpdated
        });
    }
    if (addValueDialog === undefined) {
        addValueDialog = new AddPropertyValueDialog({
            added: addPropertyValueDialog_added
        });
    }

    if (addTypeDialog === undefined) {
        addTypeDialog = new AddTypeDialog({
            onTypeAdded: addTypeDialog_onTypeAdded
        });
    }
    

    // 显示Concept的详细信息:
    createConceptDialog.opts.onAdded = createConceptDialog_onUpdated;

    // 用于显示Concept详细信息的回调函数.
    renderValues = ConceptDetailPanel.get_renderValues();

    $('#info').conceptShow(curConcept, {
        renderTitle: ConceptDetailPanel.getFunction_RenderRichTitle(createConceptDialog),
        renderValues: renderValues
    });
    $('#properties').conceptProperties(curConcept,{
        renderProperty: ConceptDetailPanel.get_renderProperty3(),
        renderPropertyValues: ConceptDetailPanel.get_renderPropertyValues2({
            articleShowDialog: dlgArticleShow
        })
    });

    // 显示“我的收藏”
    renderMyFavoriteGroups();

    renderFavoriteList();


    $('.nagu-logged').show();
    $('.nagu-logout').hide();

    // 显示“我的帐户”
    $('#accountInfo').attr('href', '/apps/public/concept.html?id=' + me.Id);

    // 如果QQ已绑定，显示QQ图标。
    if (me.QcOpenId != '') {
        var qqimg = $('<img/>').attr('src', 'http://qzonestyle.gtimg.cn/qzone/vas/opensns/res/img/Connect_logo_1.png');
        $('#accountInfo').prepend(qqimg);
    }

}

// 初始化“收藏到...”下拉菜单
function renderFavoriteList() {
    //var liFavoriteGroupBegin = $('#favoriteList-begin');
    //liFavoriteGroupBegin.next().remove();
    var ulFavorite = $('#favoriteList');
    ulFavorite.children().not('.const').remove();
    Nagu.MM.favoriteGroup().done(function (groupFss) {
        $.each(groupFss, function (i, groupFs) {
            if (groupFs.Object.ConceptId == Nagu.Concepts.SystemTypeBag) return;
            var li = newLi().appendTo(ulFavorite);
            $.when(
                Nagu.MM.isFavorite(curConcept, groupFs.Object.ConceptId),
                Nagu.CM.get(groupFs.Object.ConceptId)
                ).done(function (bFavorite, group) {
                    li.appendConcept(group.ConceptId).done(function (c) {
                        if (bFavorite) {
                            li.find('a').prepend($('<i/>').addClass('icon-ok'));
                            li.find('a').attr('title', '已经收藏到这个分组，单击取消收藏');
                            li.find('a').click(function () {
                                Nagu.MM.removeFavorite(curConcept, group.ConceptId).done(function () {
                                    renderFavoriteList();
                                });
                            });
                        } else {
                            li.find('a').prepend($('<i/>').addClass('icon-download-alt'));
                            li.find('a').click(function () {
                                Nagu.MM.favorite(curConcept, group.ConceptId).done(function (fs) {
                                    renderFavoriteList();
                                });
                            });
                        }
                    });
                });
        });
    });
}

function createFavoriteGroup() {
    var name = $.trim(prompt('请输入分组名称：'));
    if (name) {
        Nagu.MM.createFavoriteGroup(name).done(function (group, fs) {
            renderFavoriteList();
        });
    }
}

function renderMyFavoriteGroups() {
    var ph = $('#myFavoriteGroups');

    // 1. 显示“未分组”的收藏列表
    var ungroupLi = B.li().addClass('dropdown-submenu').appendTo(ph);
    var ungroupA = B.a().text('未分组').appendTo(ungroupLi);
    var ungroupUl = B.ul().addClass('dropdown-menu').appendTo(ungroupLi);
    Nagu.MM.favoriteConcepts().done(function (fss) {
        $.each(fss, function (i, fs) {
            var li = B.li().appendTo(ungroupUl);
            li.appendConcept(fs.Object.ConceptId).done(function (c) {
                li.find('a').attr('href', '/apps/public/concept.html?id=' + c.ConceptId);
            });
        });
    });
    // 2. 加入一个分隔条
    B.li().addClass('divider').appendTo(ph);

    // 3. 循环显示各个收藏分组：
    Nagu.MM.favoriteGroup().done(function (fss) {
        $.each(fss, function (i, groupFs) {
            // 跳过“系统预定义类型”分组
            if (groupFs.Object.ConceptId == Nagu.Concepts.SystemTypeBag) return;

            var groupLi = B.li().addClass('dropdown-submenu').appendTo(ph);
            groupLi.appendConcept(groupFs.Object.ConceptId);
            var groupUl = B.ul().addClass('dropdown-menu').appendTo(groupLi);
            Nagu.MM.favoriteConcepts(groupFs.Object.ConceptId).done(function (fss) {
                if (fss.length == 0) {
                    groupUl.append(B.li().append(B.a().text('无')));
                } else {
                    $.each(fss, function (i, fs) {
                        var li = B.li().appendTo(groupUl);
                        li.appendConcept(fs.Object.ConceptId).done(function (c) {
                            li.find('a').attr('href', '/apps/public/concept.html?id=' + c.ConceptId);
                        });
                    });
                }
            });
        });
    });
}

// 当QQ登录成功之后：
function afterQCLogin(reqData, opts) {
    QC.api("get_user_info").success(function (s) {
        var span = $("#qqLoginBtn");
        var spanF = newSpan().append(newImg(s.data.figureurl));
        var spanN = newSpan().text(s.data.nickname);
        var spanL = newSpan().append(newA("#").text("退出").click(function () { QQLogout(); }));

        span.empty();
        span.append(spanF).append(spanN).append(spanL);
    });

    Nagu.MM.getMe().fail(function () {
        // 使用当前QC的凭据登录nagu
        QC.Login.getMe(function (openId, accessToken) {
            Nagu.MM.loginFromQC(openId, accessToken).done(function (data) {
                if (data.Status == "OK") {
                    console.log("用户登录成功");
                    afterNaguLogin();
                }
            });
        });
    });
    
}

function QQLogout() {
    QC.Login.signOut();
    $(".logged").hide("slow", function () {
    });
}



function flushConcept() {
    ConceptManager.removeCachedConcept(curConcept);
    location.reload();
}




/**  各种回调函数 ***************************************************************************/






function createConceptDialog_onUpdated(concept) {
    
    Nagu.CM.flush(concept.ConceptId);
    $('div.nagu-concept-detail').conceptShow(concept.ConceptId, {
        renderTitle: ConceptDetailPanel.getFunction_RenderRichTitle(createConceptDialog),
        renderValues: renderValues
    });
}

function createConceptDialog_onCreated(concept) {
    window.location = "/apps/public/concept.html?id=" + concept.ConceptId;
}


function addTypeDialog_onTypeAdded(fs) {
    // 刷新缓存,重新findBySP
    Nagu.CM.flush(curConcept);
    $('#properties').empty().conceptProperties(curConcept, {
        renderProperty: ConceptDetailPanel.get_renderProperty3({
            dlgAddPropertyValue: addValueDialog
        }),
        renderPropertyValues: ConceptDetailPanel.get_renderPropertyValues2({
            articleShowDialog: dlgArticleShow
        })
    });
    showConcept();
}


function addPropertyValueDialog_added(fs) {
    // 刷新缓存
    PvsFromBaseClass[fs.Subject.ConceptId] = undefined;
}


// 添加属性之后发生：
function dlgSelectDialog_selected_addProperty(propertyId, appId) {
    Nagu.CM.addProperty(curConcept, propertyId, {
        appId: appId
    }).done(function (fs) {
        // 刷新缓存,重新findBySP
        Nagu.CM.flush(curConcept);
        $('#properties').empty().conceptProperties(curConcept, {
            renderProperty: ConceptDetailPanel.get_renderProperty3({
                dlgAddPropertyValue: addValueDialog
            }),
            renderPropertyValues: ConceptDetailPanel.get_renderPropertyValues2({
                articleShowDialog: dlgArticleShow
            })
        });
    });
}

function dlgSelectDialog_select_open(conceptId, appId) {
    window.location = '?id=' + conceptId;
}