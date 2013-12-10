var curUser;
var  dlgSearchDialog;
var dlgLogin, dlgSelectDialog;

$(function () {

    // 常量
    dlgSearchDialog = new SearchConceptDialog();

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
                var a = B.a().attr('href', url).addClass('thumbnail').append(img);
                var li = B.li().addClass('span2').append(a).appendTo(ul);
            }
        });
    });
}

/********************************************************************************************************************************/
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
}



function logout() {
    Nagu.MM.logout().done(function () {
        naguLogout();
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



/**  各种回调函数 ***************************************************************************/
