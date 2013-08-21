$(function () {
    var openId = getRequest()['openId'];
    var mpId = getRequest()['mpId'];
    var signature = getRequest()['signature'];
    var href = 'http://nagu.cc/Member/QQLogin?ReturnUrl=';

    href += 'http%3a%2f%2fnagu.cc%2fMember%2fConnectWx%2f' + signature;
    href += '%3fopenId%3d' + openId;
    href += '%26mpId%3d' + mpId;
    href += '%26ReturnUrl%3dhttp%3a%2f%2fnagu.cc%2fapps%2faccount%2flogin.html';
    href += '%3fseed%3d' + Math.random();
    $('#btnQqLogin').attr('href', href);

    Nagu.MM.getMe().done(function (me) {
        if (me.ret == 0) { // 已登录
            afterNaguLogin(me);
        } else { // 未登录
            naguLogout();
        }
    });
});