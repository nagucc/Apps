var dlgLogin;

$(function () {
    // 检查用户是否已登录
    Nagu.MM.getMe().done(function (me) {
        if (me.ret == 0) { // 已登录
            afterNaguLogin(me);
        } else { // 未登录
            naguLogout();
        }
    })

    $('#btnClearStorage').btnCleanStorage();
    initClass1();

});

function initClass1() {
    var bagId = '3526eba0-79de-4298-88df-e0a28e3a9828'; //localhost
    var select = $('#class1').empty();
    B.option().text('加载中...').appendTo(select);
    Nagu.SM.findBySP(bagId, Nagu.MType.Concept, Nagu.Rdf.Li).done(function (fss) {
        select.empty();
        B.option().val('').text('请选择（' + fss.length + '）').appendTo(select);
        $.each(fss, function (i, fs) {
            var option = B.option().val(fs.Object.ConceptId).text('loading...')
                .appendTo(select);
            Nagu.CM.get(fs.Object.ConceptId).done(function (c) {
                option.text(c.FriendlyNames[0]);
            });
        });
    });
}


function initClassN(fatherId, target) {
    target.empty();
    if (fatherId == '') {
        B.option().text('请选择上级区划').appendTo(target);
        target.change();
        return;
    }

    var propertyId = '27fb2392-cebe-4ef6-9018-655c7c08b84c';
    B.option().text('加载中...').appendTo(target);
    Nagu.SM.findByPO(propertyId, fatherId, Nagu.MType.Concept).done(function (fss) {
        target.empty();
        B.option().val('').text('请选择（' + fss.length + '）').appendTo(target);
        target.change();
        $.each(fss, function (i, fs) {
            var option = B.option().val(fs.Subject.ConceptId).text('loading...')
                .appendTo(target);
            Nagu.CM.get(fs.Subject.ConceptId).done(function (c) {
                option.text(c.FriendlyNames[0]);
            });
        });
    });
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
    dlgLogin.modal('show');
}

// 当nagu登录成功之后
function afterNaguLogin(me) {

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