var curUserId;
var host = "";
var addTypeDialog, addValueDialog, createConceptDialog;

// 全局变量
var CM, SM, N;
var renderValues;

//var curConcept = getRequest()['id'];

$(document).ready(function () {
    // 全局变量
    CM = new ConceptManager();
    SM = new StatementManager();
    N = Nagu;

    renderValues = ConceptDetailPanel.getFunction_renderRichValues(function () {
        CM.flush(getRequest()['id']);
        $('div.nagu-concept-detail').conceptShow(getRequest()['id'], {
            renderTitle: ConceptDetailPanel.getFunction_RenderRichTitle(createConceptDialog),
            renderValues: renderValues
        });
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
            onAdded: createConceptDialog_onAdded
        });
    }
    if (addValueDialog === undefined) {
        addValueDialog = new AddPropertyValueDialog({
            added: addPropertyValueDialog_added
        });
    }




    // 显示Concept的详细信息:
    if (QC.Login.check()) {
        cdp = new ConceptDetailPanel(request['id'], {
            renderTitle: ConceptDetailPanel.getFunction_RenderRichTitle(createConceptDialog),
            renderValues: renderValues,
            renderProperty: ConceptDetailPanel.getFunction_renderRichProperty(addValueDialog),
            renderPropertyValues: ConceptDetailPanel.getFunction_renderRichPropertyValues(function () {
                PvsFromBaseClass[request['id']] = undefined;
                getConcept();
            })
        });
    } else cdp = new ConceptDetailPanel(request['id']);
    cdp.show($('#detail'));
    

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

    QC.Login.getMe(function (openId, accessToken) {
        $.post("/MemberApi/QQBack/" + openId + "?accessToken=" + accessToken).done(function (data) {
            if (data.Status == "OK") {
                console.log("创建用户成功");
                getConcept();

                $(".logged").show("slow", function () {
                });
            }
        });
    });
}

function QQLogout() {
    QC.Login.signOut();
    $(".logged").hide("slow", function () {
    });
}







/**  各种回调函数 ***************************************************************************/






function createConceptDialog_onAdded(concept) {
    CM.flush(concept.ConceptId);
    $('div.nagu-concept-detail').conceptShow(concept.ConceptId, {
        renderTitle: ConceptDetailPanel.getFunction_RenderRichTitle(createConceptDialog),
        renderValues: renderValues
    });
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
    $('#myConcepts li.active').find('a').click();
}

