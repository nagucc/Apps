var curUser, curConcept;
var host = "";
var addTypeDialog, addValueDialog, createConceptDialog, cdp, dlgSelectDialog;

// 全局变量
var CM, SM, N, MM;
var renderValues;


$(document).ready(function () {
    // 全局变量
    CM = new ConceptManager();
    SM = new StatementManager();
    MM = new MemberManager();
    N = Nagu;
    curConcept = getRequest()['id'];
    // 用于显示Concept详细信息的回调函数.
    renderValues = ConceptDetailPanel.getFunction_renderRichValues(function () {
        CM.flush(getRequest()['id']);
        cdp.showDetail();
    });

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
    var request = getRequest();
    if (request['id'] === undefined) {
        dtd.reject();
        return dtd.promise();
    }

    // 获取Concept信息,显示标题
    CM.get(request['id']).done(function (concept) {
        $('#fn').text(concept.FriendlyNames[0]);
        $('#desc').text(concept.Descriptions[0]);
        dtd.resolve();
    }).fail(function () { });

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
    $.when(MM.check().done(function (status) {
        if (status.nagu) {
            createConceptDialog.opts.onAdded = createConceptDialog_onUpdated;
            cdp = new ConceptDetailPanel(request['id'], {
                renderTitle: ConceptDetailPanel.getFunction_RenderRichTitle(createConceptDialog),
                renderValues: renderValues,
                renderProperty: ConceptDetailPanel.getFunction_renderProperty3(addValueDialog),
                renderPropertyValues: ConceptDetailPanel.getFunction_renderRichPropertyValues(function () {
                    PvsFromBaseClass[request['id']] = undefined;
                    getConcept();
                }),
                renderType: ConceptDetailPanel.renderType2
            });
        } else {
            cdp = new ConceptDetailPanel(request['id']);
        }
    }).fail(function () {
        cdp = new ConceptDetailPanel(request['id']);
    })).then(function () {
        cdp.show($('#detail'));
    });
    return dtd.promise();
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
            MM.loginFromQC(openid, accessToken).done(function (data) {
                if (data.Status == "OK") {
                    console.log("用户登录成功");
                    getConcept();
                    $(".logged").show("slow", function () {
                    });
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