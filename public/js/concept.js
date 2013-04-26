var curUser, curConcept;
var host = "";
var addTypeDialog, addValueDialog, createConceptDialog, cdp, dlgSelectDialog, dlgSearchDialog, dlgArticleShow;

// 全局变量
var CM, SM, N, MM;
var renderValues;


$(document).ready(function () {
    // 全局变量
    CM = new ConceptManager();
    SM = new StatementManager();
    MM = new MemberManager();
    Nagu.init();
    N = Nagu;
    curConcept = getRequest()['id'];
    // 用于显示Concept详细信息的回调函数.
    renderValues = ConceptDetailPanel.getFunction_renderRichValues(function () {
        CM.flush(curConcept);
        cdp.showDetail();
    });

    dlgArticleShow = new ArticleShowDialog();

    

    getConcept().done(function () {
        QC.Login({
            btnId: "qqLoginBtn",
            scope: "all",
            size: "A_M"
        }, afterQCLogin);
    });

    
});

/********************************************************************************************************************************/
function getConcept() {
    var dtd = $.Deferred();

    // 获取当前待显示的Concept的id:
    if (curConcept === undefined) {
        dtd.reject();
        return dtd.promise();
    }

    // 获取Concept信息,显示标题
    CM.get(curConcept).done(function (concept) {
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
    }).fail(function () { });


    // 显示Concept的详细信息:
    MM.check().done(function (status) {
        if (status.nagu) {
            afterNaguLogin();
        } else {
            cdp = new ConceptDetailPanel(curConcept);
            cdp.show($('#detail'));
        }
    }).fail(function () {
        cdp = new ConceptDetailPanel(curConcept);
        cdp.show($('#detail'));
    });
    return dtd.promise();
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
    if (dlgSearchDialog === undefined) {
        dlgSearchDialog = new SearchConceptDialog();
    }

    // 显示Concept的详细信息:
    createConceptDialog.opts.onAdded = createConceptDialog_onUpdated;
    cdp = new ConceptDetailPanel(curConcept, {
        renderTitle: ConceptDetailPanel.getFunction_RenderRichTitle(createConceptDialog),
        renderValues: renderValues,
        renderProperty: ConceptDetailPanel.getFunction_renderProperty3(addValueDialog),
//        renderPropertyValues: ConceptDetailPanel.getFunction_renderRichPropertyValues(function () {
//            PvsFromBaseClass[curConcept] = undefined;
//            cdp.show($('#detail'));
        //        }),
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
    
    CM.flush(concept.ConceptId);
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
}


function dlgSelectDialog_selected_addProperty(propertyId, appId) {
    CM.addProperty(curConcept, propertyId, {
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