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
        var cids = [];
        for (var i = 0; i < fss.length; i++) {
            cids.push(fss[i].Object.ConceptId)
        }
        Nagu.CM.bulkGet(cids).done(function (cs) {
            select.empty();
            B.option().val('').text('请选择（' + cs.length + '）').appendTo(select);

            $.each(cs, function (i, c) {
                var option = B.option().val(c.ConceptId)
                .appendTo(select);
                option.text(c.FriendlyNames.sort(function (a, b) {
                    return a.length - b.length;
                })[0]);
            });
        });
    });
}


function initClassN(fatherId, target, $this) {
    if (fatherId != '') {
        $this.next('a').removeAttr('disabled');
        $this.next('a').attr('href', '/apps/public/concept.html?id=' + fatherId);
    } else {
        $this.next('a').attr('disabled', 'disabled');
    }
    if (target == null) return;

    target.empty();
    if (fatherId == '' || fatherId === undefined) {
        B.option().text('请先选择上级区划').val('').appendTo(target);
        target.change();
        return;
    }

    // 通过“上级直属区划”属性搜索
    var propertyId = '27fb2392-cebe-4ef6-9018-655c7c08b84c';
    B.option().text('加载中...').appendTo(target);
    Nagu.SM.findByPO(propertyId, fatherId, Nagu.MType.Concept).done(function (fss) {
        target.empty();
        B.option().val('').text('请选择（' + fss.length + '）').appendTo(target);
        target.change();

        var cids = [];
        for (var i = 0; i < fss.length; i++) {
            cids.push(fss[i].Subject.ConceptId)
        }
        Nagu.CM.bulkGet(cids).done(function (cs) {
            $.each(cs, function (i, c) {
                var option = B.option().val(c.ConceptId)
                        .appendTo(target);
                option.text(c.FriendlyNames.sort(function (a, b) {
                    return a.length - b.length;
                })[0]);
            });
        });
    });
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