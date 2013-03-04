var curUserId;

/********************************************************************************************************************************/
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
        $.getJSON("/MemberApi/QQBack/" + openId + "?accessToken=" + accessToken).done(function (data) {
            if (data.Status == "OK") {
                console.log("创建用户成功");
                curUserId = data.UserId;
                $(".logged").show("slow", function () {
                    var ss = new SaidStatus(0);
                    ss.initAllSpan();
                    initBtnSaidStatus();
                });
                var sm = new StatementManager();
                sm.findByPO(Nagu.Concepts.RdfType, Nagu.Concepts.PrivateObject, Nagu.MType.Concept, { appId: curUserId }).done(function (fss) {
                    $('#myConcepts').statementList(fss,
                        {
                            clearBefore: true,
                            renderItem: function (fss, li) {
                                // 在页面左边以胶囊按钮的方式展示实例列表
                                return renderMorpheme2(fss.Subject, li).done(function (c) {
                                    var ss = new SaidStatus(li.attr('statementId'));
                                    li.find('a').prepend(ss.getSpan());
                                    li.find('a').attr('ConceptId', c.ConceptId).click(conceptBtn_onClick);
                                    li.addClass("concept-list-item");
                                });
                            }
                        });
                });

            }
        });
    });
}

function conceptBtn_onClick() {
    $('.concept-list-item').removeClass('active');
    $(this).closest("li").addClass("active");
    $('#conceptInfo').conceptShow($(this).attr('ConceptId'));
    $('#infoFromType').conceptInfoFromTypes($(this).attr('ConceptId'), { appId: curUserId });
//    $('.nagu-said-status-toggler').attr('StatementId', $(this).closest("li").attr('StatementId'));
//    var ssb = new SaidStatusButton($(this).closest("li").attr('StatementId'));

//    // 获取Concept的所有rdf:type：
//    findBySP($(this).attr('ConceptId'), MorphemeType.Concept, Nagu.Concepts.RdfType).done(function (fss) {
//        $('#infoFromType').empty();
//        $.each(fss, function (i, fs) {
//            var cm = new ConceptManager();
//            cm.get(fs.Object.ConceptId).done(function (type) {
//                $('#infoFromType').append($('<h3></h3>').text(type.FriendlyNames[0] + '· · · · · ·'));
//                var dl = $('<dl></dl>');
//                renderPropertyValues(dl, curSubject, MorphemeType.Concept, type.ConceptId, onShowValueAsStatement);
//                $('#infoFromType').append(dl);
//            });

//        });

//    });
}


function QQLogout() {
    QC.Login.signOut();
    $(".logged").hide("slow", function () {
    });
}

function createConcept() {
    //1. 数据验证
    var alert = $("div#dlgCreateConcept div.alert");
    alert.hide();

    ulError = $("div#dlgCreateConcept ul.error-list").empty();
    var hasError = false;
    var fn = $("#tbConceptName").val();
    var desc = $("#tbConceptDesc").val();

    if (fn === undefined || fn == "") {
        hasError = true;
        ulError.append(newLi().append("\"名称\"不能为空"));
    }
    if (desc === undefined || desc == "") {
        hasError = true;
        ulError.append(newLi().append("\"简介\"不能为空"));
    }
    if (hasError) {
        alert.show();
        return;
    }

    //2. 完成Class创建
    var cm = new ConceptManager();
    cm.create(fn, desc).done(function (c) {
        console.log("添加Concept成功");
        cm.addRdfType(c.ConceptId, Nagu.Concepts.PrivateObject, { appId: curUserId }).done(function (fs) {
            console.log("添加PrivateObject成功");
            $("div#dlgCreateConcept input").val("");

            var li = newLi().attr("statementId", fs.StatementId).addClass("concept-list-item");
            $('#myConcepts').prepend(li);
            renderMorpheme2(fs.Subject, li).done(function (c) {
                var icon = StarIcon().addClass('nagu-said-status').attr('StatementId', li.attr('statementId'));
                li.find('a').prepend(newSpan().addClass('logged').append(icon));
                li.find('a').attr('ConceptId', c.ConceptId).click(conceptBtn_onClick);
                li.find('a').click();
            });
            $("div#dlgCreateConcept").modal('toggle');
        });
    });
}