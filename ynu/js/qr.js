var curConcept;
Nagu.Ynu = {
    Class: '6c2187d4-30ab-4dc4-8225-f0ff89c79d58', // 可手机扫描显示对象
    Intro: '0c338930-e9bf-4da7-b672-8dc895abe23a', // 介绍,
    Message: 'dc86f511-9714-40bb-9ee5-dfa1375ce501' // 访客留言
};
$(function () {
    Nagu.MM.getMe().done(function (me) {
        if (me.ret == -1) {
            $("input").click(function () {
                $('#myModal').modal()
            });
            $('.nagu-logged').hide();
            $('.nagu-logout').show();
        } else {
            $('.nagu-logged').show();
            $('.nagu-logout').hide();
        }
    });

    // 初始化登录按钮
    $('#btnQqLogin').attr('href', 'http://nagu.cc/Member/QQLogin?returnUrl=' + window.location.href);

    curConcept = getRequest()['id'];
    if (curConcept === undefined || curConcept == '') return;

    // 显示名称
    Nagu.CM.get(curConcept).done(function (c) {
        $('h1').text(c.FriendlyNames[0]);
        for (var i = 0; i < c.TypeFss.length; i++) {
            if (c.TypeFss[i].Object.ConceptId == Nagu.Ynu.Class) return;
        }
        // 如果当前概念还不是“可手机扫描显示对象”，则加入相应的类。
        Nagu.CM.addRdfType(curConcept, Nagu.Ynu.Class);
    });

    // 显示介绍
    Nagu.CM.getPropertyValues(curConcept, Nagu.Ynu.Intro).done(function (fss) {
        if (fss.length > 0) {
            $('#intro').appendMorpheme(fss[0].Object);
        }
    });

    // 显示用户内容
    Nagu.CM.getPropertyValues(curConcept, Nagu.Ynu.Message).done(function (pvs) {

        // 逐条显示用户内容
        $.each(pvs, function (i, fs) {
            var div = B.div().appendTo($('.alert'));
            var h5 = B.h5().appendTo(div).appendMorpheme(fs.Object);
            var h6 = B.h6().appendTo(div);
            Nagu.SayM.saidBy(fs.StatementId).done(function (sayFss) {

                // 逐个显示用户痕迹
                $.each(sayFss, function (j, sayFs) {
                    var img = B.img().height('30').width('30').appendTo(h6);
                    Nagu.MM.getUserInfo(sayFs.Subject.ConceptId).done(function (user) {
                        if (user.ret == 0) {
                            img.attr('src',user.FigureUrls[0])
                        }
                    });
                });
            });
        });
        

    });

});

function saySomething() {
    var text = $("input").val();
    if (text == '') return;

    Nagu.CM.addLiteralPropertyValue(curConcept, Nagu.Ynu.Message, text).done(function (fs) {
    });
}