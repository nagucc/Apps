﻿var dlgLogin;

$(function () {

    //var mode = getRequest()['mode'];
    //if (mode == 'debug') $('#divDebug').show();

    //log('index ready');
    // 检查用户是否已登录
    Nagu.MM.getMe().done(function (me) {
        log('me.ret: ' + me.ret);
        if (me.ret == 0) { // 已登录
            afterNaguLogin(me);
        } else { // 未登录
            naguLogout();
        }
    }).fail();
    //showApps();

    if ($.jStorage && $.jStorage.storageAvailable()) {
        var size = $.jStorage.storageSize();
        $('#btnClearStorage').append($('<i/>').addClass('icon-trash icon-white'))
            .append('清空缓存(共' + size + '字节)')
            .click(function () {
            $.jStorage.flush()
            size = $.jStorage.storageSize();
            $('#btnClearStorage').empty()
                .append($('<i/>').addClass('icon-trash icon-white'))
                .append('清空缓存(共' + size + '字节)');
        });
    } else {
        $('#btnClearStorage').hide();
    }
});




function showApps() {

    //显示圆圈，表示正在加载
    var loading = loadingImg128();
    $('.marketing').append(loading);
    Nagu.SM.findByPO(Nagu.Rdf.Type, Nagu.Concepts.App, Nagu.MType.Concept).done(function (fss) {
        loading.remove();
        var ph;
        for (var i = 0; i < fss.length; i++) {
            if (i % 3 == 0) {
                ph = $('<div/>').addClass('row').appendTo($('.marketing'));
            }
            var fs = fss[i];
            var span4 = $('<div/>').addClass('span4').appendTo(ph);
            Nagu.CM.get(fs.Subject.ConceptId).done(function (concept) {
                var img = $('<img/>').attr('src', '/content/images/glyphicons/glyphicons_308_share_alt.png');
                img.addClass('bs-icon').appendTo(span4);
                var h2 = $('<h2/>').text(concept.FriendlyNames[0]).appendTo(span4);
                var p = $('<p/>').append(concept.Descriptions[0]).append($('<br/>')).appendTo(span4);
                var a = $('<a/>').addClass('btn btn-primary').attr('href', '/apps/public/concept.html?id=' + concept.ConceptId);
                a.text('进入 »').appendTo(p);
            });
            
        }
    });
}

function afterNaguLogin(me) {
    $('.nagu-logged').show();
    $('.nagu-logout').hide();
    $('#accountInfo').text(me.Name).attr('href', '/apps/public/concept.html?id=' + me.Id);

    // 如果QQ已绑定，显示QQ图标。
    if (me.QcOpenId != '') {
        var qqimg = $('<img/>').attr('src', 'http://qzonestyle.gtimg.cn/qzone/vas/opensns/res/img/Connect_logo_1.png');
        $('#accountInfo').prepend(qqimg);
    }
    
}

function naguLogout() {
    $('.nagu-logged').hide();
    $('.nagu-logout').show();
    

    if (dlgLogin === undefined) {
        dlgLogin = new LoginDialog({
            success: function (me) {
                afterNaguLogin(me);
            },
            fail: function (data) {
                alert('登录失败');
                log('new pass: ' + data.newPass);
            }
        });
    }

    
}

function logout() {
    Nagu.MM.logout().done(function () {
        $.jStorage.flush();
        naguLogout();
    });
}