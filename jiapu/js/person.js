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

    $('#addInfo').attr('href', '/apps/public/concept.html?id=' + curConcept);

    $.when(showPerson()).done(
    QC.Login({
        btnId: "qqLoginBtn",
        scope: "all",
        size: "A_M"
    }, afterQCLogin));
});




function showPerson() {
    var dtd = $.Deferred();

    // 获取当前待显示的Concept的id:
    if (curConcept === undefined) {
        dtd.reject();
        return dtd.promise();
    }

    // 显示“家族成员”详细信息：
    var pm = new Person(curConcept);
    pm.get().done(function (person) {
        // 显示标题
        $(".brand").text(person.FriendlyNames[0] + "@家谱系统");

        // 显示左侧属性列表
        var cdp = new ConceptDetailPanel(curConcept, {
            renderProperty: ConceptDetailPanel.renderProperty4
        });
        cdp.show($('#conceptDetail'));

        // 显示家族树:
        $('#gen20 > ul').conceptList([person], {
            renderItem: person_conceptList_renderItem
        });
    });



    $("#qrcode").empty().qrcode({
        width: 150,
        height: 150,
        text: "http://nagu.cc/apps/jiapu/person.html?id=" + curConcept
    });
    return dtd.promise();
}

/********************************************************************************************************************************/
// 当QQ登录成功之后：
function afterQCLogin(reqData, opts) {
    var dtd = $.Deferred();

    // 获取用户信息并显示：
    QC.api("get_user_info").success(function (s) {
        var span = $("#qqLoginBtn");

        var spanF = newSpan().append(newImg(s.data.figureurl));
        var spanN = newSpan().text(s.data.nickname);
        var spanL = newSpan().append(newA("#").text("退出").click(function () {
            QQLogout();
        }));
        $(".logged").show("slow", function () {
            $('.nagu-said-status').each(function (i, s) {
                var sm = new SayManager();
                sm.status($(s).attr('statementid')).done(function (hasSaid) {
                    initSaidStatus($(s).attr('statementid'), hasSaid);
                    
                });
            });
            initBtnSaidStatus(function () {
                if ($('.nagu-said-status-toggler').text() == '加注星标') $('.concept-list-item.active').prependTo($('#myfamilies'));
                else $('.concept-list-item.active').prependTo($('#families'));
            });
        });
        span.empty();
        span.append(spanF).append(spanN).append(spanL);
    });

    // 登录服务器端
    QC.Login.getMe(function (openId, accessToken) {
        $.getJSON("/MemberApi/QQBack/" + openId + "?accessToken=" + accessToken, function (data) {
            if (data.Status == "OK") {
                console.log("创建用户成功");
                dtd.resolve();
            }
        });
    });
    return dtd.promise();
}
























