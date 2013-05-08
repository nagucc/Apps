var curUser, curStatement;
var host = "";
var addTypeDialog, addValueDialog, createConceptDialog, cdp, dlgSelectDialog, dlgSearchDialog, dlgArticleShow;

// 全局变量
var renderValues;


$(document).ready(function () {
    // 全局变量

    curStatement = getRequest()['id'];
    getStatement();

    // 用于显示Concept详细信息的回调函数.
    //renderValues = ConceptDetailPanel.getFunction_renderRichValues(function () {
    //    Nagu.CM.flush(curConcept);
    //    cdp.showDetail();
    //});

    //dlgArticleShow = new ArticleShowDialog();
    //dlgSearchDialog = new SearchConceptDialog();
    

    //getConcept().done(function () {
    //    QC.Login({
    //        btnId: "qqLoginBtn",
    //        scope: "all",
    //        size: "A_M"
    //    }, afterQCLogin);
    //});

    
});

/********************************************************************************************************************************/
function getStatement() {
    //var dtd = $.Deferred();

    // 获取当前待显示的Statement的id:
    if (curStatement === undefined) {
        dtd.reject();
        return dtd.promise();
    }
    $('#id').text(curStatement);
    return $('#fn').appendStatement(curStatement);
    // 获取Concept信息,显示标题

    //return dtd.promise();
}




// 当nagu登录成功之后
function afterNaguLogin() {
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

    if (dlgSelectDialog === undefined) {
        dlgSelectDialog = new SelectConceptDialog();
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
            changed: function () {
                PvsFromBaseClass[curConcept] = undefined;
                cdp.show($('#detail'));
            },
            articleShowDialog: dlgArticleShow
        }),
        renderType: ConceptDetailPanel.renderType2
    });
    cdp.show($('#detail'));

    $(".logged").show("slow", function () {
    });
    $('.nagu-logged').show();

    // 显示“帐户信息”
    Nagu.MM.getMe().done(function (me) {
        $('#accountInfo').attr('href', '/apps/public/concept.html?id=' + me.Id);        
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

    MM.getMe().fail(function () {
        // 使用当前QC的凭据登录nagu
        QC.Login.getMe(function (openId, accessToken) {
            MM.loginFromQC(openId, accessToken).done(function (data) {
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
    var sm = new StatementManager();
    // 刷新缓存,重新findBySP
    sm.flush('', fs.Subject.ConceptId, Nagu.Concepts.RdfType, '', curUserId);
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