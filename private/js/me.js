var curUser;

$(function () {

    // 检查用户是否已登录
    Nagu.MM.getMe().done(function (me) {
        if (me.ret == 0) { // 已登录
            afterNaguLogin(me);
            curUser = me.Id;
            showPicList();
        } else { // 未登录
            naguLogout();
        }
    })

    // 初始化“清空缓存”按钮
    $('#btnClearStorage').btnCleanStorage();

});



function showPicList() {
    var ul = $('.thumbnails').empty();
    Nagu.CM.getPropertyValues(curUser, Nagu.User.HasPicture, {
        appId: curUser
    }).done(function (fss) {
        $.each(fss, function (i, fs) {
            if (fs.Object.Value) {
                var url = fs.Object.Value; //+ '?' + randomInt();

                // 如果图片来自微信，由于微信图片服务器无法直接连上，因此使用wrap中转。
                //var regex = new RegExp("^http://mmsns.qpic.cn/mmsns/", "i");
                //if (regex.test(url)) {
                //    url = 'http://nagu.cc/func/wrap/?url=' + url;
                //}
                var img = B.img().attr('src', url);
                var a = B.a().attr('target','_blank').attr('href', url).addClass('thumbnail').append(img);
                var li = B.li().addClass('span2').append(a).appendTo(ul);
            }
        });
    });
}