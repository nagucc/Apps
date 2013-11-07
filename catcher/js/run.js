var catches = [];
catches['#xiangs'] = [
    'http://nagu.cc/catcher/catchXiangs',
    1,
    50000,
    20
];
$(function () {

    // 检查用户是否已登录
    Nagu.MM.getMe().done(function (me) {
        if (me.ret == 0) { // 已登录
            afterNaguLogin(me);
            $('#projectList a').click(projectList_click);
        } else { // 未登录
            naguLogout();
        }
    })
});

function projectList_click() {
    $(this).parent().siblings().removeClass('active');
    $(this).parent().addClass('active');
    var data = catches[$(this).attr('href')];
    try{
        $('#url').val(data[0]);
        $('#startIndex').val(data[1]);
        $('#endIndex').val(data[2]);
        $('#stepLength').val(data[3]);
    }
    catch (e) {
        alert('出错了');
        $('#url').val('');
        $('#startIndex').val('');
        $('#endIndex').val('');
        $('#stepLength').val('');
    }
}

function start() {
    var url = $('#url').val();
    var startIndex = $('#startIndex').val();
    var endIndex = $('#endIndex').val();
    var stepLength = $('#stepLength').val();

    var runStep = function (url, start, end, step) {
        var ul = $('#resultList');
        var text = start + ' - ' + Math.min(end, start + step - 1) + ': ';
        var startTime = new Date();
        $.post(url, {
            startIndex: start,
            endIndex: Math.min(end, start + step -1)
        }).done(function (data) {
            if (data.ret == 0) {
                text += '执行成功。';

                if (parseInt(start) + parseInt(step) - 1 < parseInt(end)) {
                    runStep(url, start + step, end, step);
                }
            } else {
                text += '执行失败(' + data.msg + ')。';
            }
        }).fail(function (a, b, c) {
            text += '出现未知错误，执行失败。';
        }).always(function () {
            var endTime = new Date();
            text += '执行时间：';
            text += (endTime.getTime() - startTime.getTime()) / 1000 + 's';
            B.li().text(text).appendTo(ul);
            if (ul.find('li').size() > 20) {
                ul.find('li').first().remove();
            }
            if (parseInt(start) + parseInt(step) >= parseInt(end)) {
                B.li().text('执行完成').appendTo(ul);
            }
        });

    }

    $('#resultList').empty();

    runStep(url, parseInt(startIndex), parseInt(endIndex), parseInt(stepLength));

    B.li().text('开始执行').appendTo($('#resultList'));
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