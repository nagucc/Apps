var curUser, curConcept;
var host = "";
var addTypeDialog, addValueDialog, createConceptDialog, cdp, dlgSelectDialog, dlgSearchDialog, dlgArticleShow;
var dlgLogin;

// 全局变量
var renderValues;


$(function () {
    curConcept = getRequest()['id'];
    if (curConcept === undefined || curConcept == '') return;

    // 用于显示Concept详细信息的回调函数.
    renderValues = ConceptDetailPanel.getFunction_renderRichValues(function () {
        Nagu.CM.flush(curConcept);
        cdp.showDetail();
    });

    dlgArticleShow = new ArticleShowDialog();
    dlgSearchDialog = new SearchConceptDialog();
    dlgSelectDialog = new SelectConceptDialog();
    

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
        $("#qrcode").qrcode({
            width: 150,
            height: 150,
            text: window.location.href
        });
    } catch (e) { }
});

/********************************************************************************************************************************/
function getConcept() {
    var dtd = $.Deferred();

    // 获取Concept信息,显示与登录无关的信息
    Nagu.CM.get(curConcept).done(function (concept) {
        $('#fn').text(concept.FriendlyNames[0]);
        $('#desc').text(concept.Descriptions[0]);
        $('#id').text(concept.ConceptId);


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

        dtd.resolve();
    });

    cdp.show($('#detail'));
    return dtd.promise();
}

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

    cdp = new ConceptDetailPanel(curConcept);

    getConcept();
}



function logout() {
    Nagu.MM.logout().done(function () {
        naguLogout();
    });
}

// 当nagu登录成功之后
function afterNaguLogin(me) {

    // 初始化“添加/删除收藏”按钮
    $('#btnFavorite').btnFavorite(curConcept);

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
            onTypeAdded: addPropertyValueDialog_added
        });
    }
    

    // 显示Concept的详细信息:
    createConceptDialog.opts.onAdded = createConceptDialog_onUpdated;
    cdp = new ConceptDetailPanel(curConcept, {
        renderTitle: ConceptDetailPanel.getFunction_RenderRichTitle(createConceptDialog),
        renderValues: renderValues,
        renderProperty: ConceptDetailPanel.get_renderProperty3({
            dlgAddPropertyValue: addValueDialog
        }),
        renderPropertyValues: ConceptDetailPanel.get_renderPropertyValues2({
            articleShowDialog: dlgArticleShow
        }),
        renderType: ConceptDetailPanel.renderType2
    });

    $('.nagu-logged').show();
    $('.nagu-logout').hide();

    // 显示“帐户信息”
    $('#accountInfo').text(me.Name).attr('href', '/apps/public/concept.html?id=' + me.Id);

    // 如果QQ已绑定，显示QQ图标。
    if (me.QcOpenId != '') {
        var qqimg = $('<img/>').attr('src', 'http://qzonestyle.gtimg.cn/qzone/vas/opensns/res/img/Connect_logo_1.png');
        $('#accountInfo').prepend(qqimg);
    }

    getConcept();
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
    Nagu.SM.flush('', fs.Subject.ConceptId, Nagu.Concepts.RdfType, '', curUserId);
    $('#myConcepts li.active').find('a').click();
}


function addPropertyValueDialog_added(fs) {
    // 刷新缓存
    PvsFromBaseClass[fs.Subject.ConceptId] = undefined;
    cdp.showFromTypes();
    cdp.showProperties();
}


function dlgSelectDialog_selected_addProperty(propertyId, appId) {
    Nagu.CM.addProperty(curConcept, propertyId, {
        appId: appId
    }).done(function (fs) {
        cdp.showProperties();
    });
}

function dlgSelectDialog_select_open(conceptId, appId) {
    window.location = '?id=' + conceptId;
}



function test(eventData) {
    alert(eventData);
}