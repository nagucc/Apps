var curSubject;
var curStype;


function showClasses2() {
    var dtd = $.Deferred(); //在函数内部，新建一个Deferred对象        
    var request = getRequest();

    // 在左侧显示所有class
    var sm = new StatementManager();
    sm.findByPO(Nagu.Concepts.RdfType, Nagu.Concepts.OwlClass, Nagu.MType.Concept).done(function (fss) {
        var resolvedDeferred = 0;
        var limit = Math.min(fss.length, 10);
        $.each(fss.slice(0,limit), function (i, fs) {
            // 生成显示框架：li > a
            var li = newLi().attr("statementId", fs.StatementId).attr("ConceptId", fs.Subject.ConceptId).addClass("concept-list-item");
            $("#classes").append(li);

            if (request["id"] === undefined && i == 0) curClassId = fs.Subject.ConceptId;
            if (request["id"] == fs.Subject.ConceptId) curClassId = fs.Subject.ConceptId;

            // 在页面左边以胶囊按钮的方式展示家族列表
            renderMorpheme2(fss[i].Subject, li).done(function (c) {
                var ss = new SaidStatus(li.attr('statementId'));
                li.find('a').prepend(ss.getSpan());
                li.find('a').attr('ConceptId', c.ConceptId).click(conceptBtn_onClick);
                if (curClassId == c.ConceptId) li.find('a').click();
                if (++resolvedDeferred == limit) dtd.resolve();
            });
        });
        // 初始化“显示更多”按钮
        var btn = $('#btnMoreClass');
        btn.attr('startIndex', limit);

    }).fail(function () { alert("showClasse2出错啦！"); dtd.reject(); });
    return dtd.promise();
}

function displayMoreClass() {
    var btn = $('#btnMoreClass');
    var start = Number(btn.attr('startIndex'));

    // 在左侧从start开始显示最多10个Class
    var sm = new StatementManager();
    sm.findByPO(NaguConcepts.RdfType, NaguConcepts.OwlClass, MorphemeType.Concept).done(function (fss) {
        //var resolvedDeferred = 0;
        var limit = Math.min(fss.length, start + 10);
        $.each(fss.slice(start, limit), function (i, fs) {
            // 生成显示框架：li > a
            var li = newLi().attr("statementId", fs.StatementId).attr("ConceptId", fs.Subject.ConceptId).addClass("concept-list-item");
            $("#classes").append(li);

            // 在页面左边以胶囊按钮的方式展示家族列表
            renderMorpheme2(fs.Subject, li).done(function (c) {
                var ss = new SaidStatus(li.attr('statementId'));
                li.find('a').prepend(ss.getSpan());
                li.find('a').attr('ConceptId', c.ConceptId).click(conceptBtn_onClick);
                //if (++resolvedDeferred == limit - start) dtd.resolve();
            });
        });
        btn.attr('startIndex', limit);
        if (fss.length <= limit) btn.hide();
    });
}


function conceptBtn_onClick() {
    $('.concept-list-item').removeClass('active');
    $(this).closest("li").addClass("active");
    curSubject = $(this).attr('ConceptId');
    $('.nagu-said-status-toggler').attr('StatementId', $(this).closest("li").attr('StatementId'));
    var ssb = new SaidStatusButton($(this).closest("li").attr('StatementId'));

    // 获取Concept的所有rdf:type：
    findBySP($(this).attr('ConceptId'), MorphemeType.Concept, Nagu.Concepts.RdfType).done(function (fss) {
        $('#infoFromType').empty();
        $.each(fss, function (i, fs) {
            var cm = new ConceptManager();
            cm.get(fs.Object.ConceptId).done(function (type) {
                $('#infoFromType').append($('<h3></h3>').text(type.FriendlyNames[0] + '· · · · · ·'));
                var dl = $('<dl></dl>');
                renderPropertyValues(dl, curSubject, MorphemeType.Concept, type.ConceptId, onShowValueAsStatement);
                $('#infoFromType').append(dl);
            });

        });

    });
}








/********************************************************************************************************************************/
// 当QQ登录成功之后：
function afterQCLogin(reqData, opts) {
    QC.api("get_user_info").success(function (s) {
        var span = $("#qqLoginBtn");

        var spanF = newSpan().append(newImg(s.data.figureurl));
        var spanN = newSpan().text(s.data.nickname);
        var spanL = newSpan().append(newA("#").text("退出").click(function () {
            QQLogout();
        }));
        $(".logged").show("slow", function () {
            //            var sm = new SayManager();
            //            $('.nagu-said-status').each(function (i, s) {

            //                sm.status($(s).attr('statementid')).done(function (fsId, hasSaid) {
            //                    initSaidStatus(fsId, hasSaid);
            //                    if (hasSaid) {
            //                        var li = $('.concept-list-item[StatementId="' + $(s).attr('statementid') + '"]');
            //                        li.prependTo($('#myclasses'));
            //                    }
            //                });
            //            });
            var ss = new SaidStatus(0);
            ss.initAllSpan();
            initBtnSaidStatus();
        });
        span.empty();
        span.append(spanF).append(spanN).append(spanL);
    });

    QC.Login.getMe(function (openId, accessToken) {
        $.getJSON("/MemberApi/QQBack/" + openId + "?accessToken=" + accessToken, function (data) {
            if (data.Status == "OK") {
                console.log("创建用户成功");
            }
        });
    });


}



function QQLogout() {
    QC.Login.signOut();
    $(".logged").hide("slow", function () {
    });
}

function createClass() {
    //1. 数据验证
    $("div#dlgCreateClass div.alert").hide();
    ulError = $("div#dlgCreateClass ul.error-list").empty();
    var hasError = false;
    var fn = $("#tbClassName").val();
    var desc = $("#tbClassDesc").val();

    if (fn == "") {
        hasError = true;
        ulError.append(newLi().append("\"Class名称\"不能为空"));
    }
    if (desc == "") {
        hasError = true;
        ulError.append(newLi().append("\"简介\"不能为空"));
    }
    if (hasError) {
        $("div#dlgCreateClass div.alert").show();
        return;
    }

    //2. 完成Class创建
    var cm = new ConceptManager();
    cm.create(fn, desc).done(function (c) {
        cm.addRdfType(c.ConceptId, Nagu.Concepts.OwlClass).done(function (fs) {
            console.log("添加Class成功");
            $("div#dlgCreateClass input").val("");

            var li = newLi().attr("statementId", fs.StatementId).attr("ConceptId", fs.Subject.ConceptId).addClass("concept-list-item");
            $('#myclasses').prepend(li);
            renderMorpheme2(fs.Subject, li).done(function (c) {
                var icon = StarIcon().addClass('nagu-said-status').attr('StatementId', li.attr('statementId'));
                li.find('a').prepend(newSpan().addClass('logged').append(icon));
                li.find('a').attr('ConceptId', c.ConceptId).click(conceptBtn_onClick);
                li.find('a').click();
            });
            $("div#dlgCreateClass").modal('toggle');
        });
    });
}

function addPropertyValue2() {
    var onPropertyValueAdded = null;
    var ulError = $("#dlgAddValue ul.error-list").empty();
    // 如果属性值是Concept：
    if ($('#collapseConcept').hasClass('in')) {
        var fn = $('#txtFn').val();
        var conceptId = $('#txtConceptId').val();
        if (fn == "") {
            ulError.append(newLi().append("请输入关键字并选择Concept"));
            $('#dlgAddValue .alert-error').show();
            return;
        }
        addConceptPropertyValue(curSubject, curStype, $('#dlgAddValue').attr('propertyId'), fn, conceptId, onPropertyValueAdded);
    }
    else { // 属性值是文本：
        var val = $('#txtValue').val();
        if (val == "") {
            ulError.append(newLi().append("请输入属性值"));
            $('#dlgAddValue .alert-error').show();
            return;
        }
        createStatement(curSubject, curStype, $('#dlgAddValue').attr('propertyId'), val, MorphemeType.Literal).done(onPropertyValueAdded);
    }
}