var curUser;

$(function () {

    // 检查用户是否已登录
    Nagu.MM.getMe().done(function (me) {
        if (me.ret == 0) { // 已登录
            afterNaguLogin(me);
            curUser = me.Id;
        } else { // 未登录
            naguLogout();
        }
    })

    // 初始化“清空缓存”按钮
    $('#btnClearStorage').btnCleanStorage();

});