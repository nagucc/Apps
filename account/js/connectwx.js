$(function () {
    var openId = getRequest()['openId'];
    var mpId = getRequest()['mpId'];
    var signature = getRequest()['signature'];
    var href = 'http://nagu.cc/Member/QQLogin?ReturnUrl=';
    href += 'http%3a%2f%2fnagu.cc%2fMember%2fConnectWx%2f'+signature;
    href += '%3fopenId%3d'+openId;
    href += '%26mpId%3d'+mpId;
    href += '%26ReturnUrl%3dhttp%3a%2f%2fnagu.cc%2fapps%2faccount%2fconnectwx.html';
    $('#btnQqLogin').attr('href', href);

    Nagu.MM.wxStatus(openId, mpId).done(function (wxs) {
        if (wxs.IsConnected) {
            $('.wx-logged').show();
        } else {
            $('.wx-logout').show();
        }
    });
});