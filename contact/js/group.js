var jQT, curGroup, wxmId, curContact;

// 指示是否隐藏公共联系人
var bHidePublic = true;

// 用于访问特定微信应用资源的Key，这里应该是一个只读Key。
var gKey;

// 描述联系人主从关系的表：
var contactsMS = new Array();

var dtdMe;

var history = [];

jQuery.fn.center = function () {
    this.css("position", "absolute");
    this.css("top", ($(window).height() - this.height()) / 2 + $(window).scrollTop() + "px");
    this.css("left", ($(window).width() - this.width()) / 2 + $(window).scrollLeft() + "px");
    return this;
}

// 定义已知的AppId常量。
var AppIds = {
    YnuPublic: '944c4890-a848-44b0-b1d7-a50217cfd405' // 云南大学公众服务
};
var Keys = {
    YnuPublic: '' //云南大学公众黄页只读Key
};

// 根据当前站点域名设置当前apps。
var appsArray = [];
//appsArray['nagu.cc'] = [AppIds.YnuPublic];
var apps = '';
if(appsArray[location.host]) apps = appsArray[location.host];

// 根据当前站点域名设置可用的Keys
var keysArray = [];
//appsArray['nagu.cc'] = [Keys.YnuPublic];
var keys = '';
if (Keys[location.host]) keys = Keys[location.host];

var defaultSiteSetting = {
    title: '纳谷通讯录',
    icon: 'http://nagu.cc/Content/Images/logo80.jpg',
    icon4: 'http://nagu.cc/Content/Images/logo1065.png',
    defaultOwnerId: '20b82ee0-decc-43c6-ac8f-11f008a6c2d1', // 当用户未登录时，显示BelongTo 此OwnerId的数据。
    keys: [
        '566fca71-fb13-4acc-86f1-6982114bfa46' // 云南大学公众黄页只读服务Key
    ],
    sortConcepts: function (a, b) {
        return 0;
    }
}
var siteSettings = [];
siteSettings['nagu.cc'] = $.extend(defaultSiteSetting, {
});
var currentSiteSetting = defaultSiteSetting;
if (siteSettings[location.host]) {
    currentSiteSetting = siteSettings[location.host]
}

$(function () {
    
    document.title = currentSiteSetting.title;
    jQT = new $.jQTouch({
        icon: currentSiteSetting.icon,
        icon4: currentSiteSetting.icon4,
        addGlossToIcon: false,
        startupScreen: 'images/startup.png',
        statusBar: 'black-translucent'
    });

    // 添加事件绑定
    //$('#contact').on('pageAnimationEnd', function (e, data) {
    //    // 处理进入事件
    //    if (data.direction == 'in') {
    //        if ($('#contact').data('conceptId')) {
    //            showContact($('#contact').data('conceptId'));
    //        } else {
    //            jQT.goTo('#home');
    //        }
    //    }
    //});

    //$('#home').on('pageAnimationEnd', function (e, data) {
    //    // 处理进入事件
    //    if (data.direction == 'in') {
    //        showContactList();
    //    }
    //});

    curContact = getRequest()['id'];
    wxmId = getRequest()['wxm'];
    gKey = getRequest()['gkey'];

    dtdMe = Nagu.MM.getMe();

    // 如果指定了ContactId，则直接显示Contact
    if (curContact) {
        //$('#contact').data('conceptId', curContact);
        $('.current').removeClass('current');
        $('#contact').addClass('current');
    } else {
        location.hash = 'home';
    }

    $.when(dtdMe).then(function (me) {
        if (me.ret == 0) {
            $('#btnLogin').hide();
        } else {
            $('#btnLogin').show();
        }
    });

    // 初始化首页
    showContactList();
});

function showContactList() {

    $.when(dtdMe).then(function (me) {
        var gid = currentSiteSetting.defaultOwnerId;
        if (me.ret == 0) gid = me.Id;

        // 显示当前用户收藏的联系人
        Nagu.SM.findByPO(Nagu.Contact.BelongsTo, gid, Nagu.MType.Concept, {
            keys: currentSiteSetting.keys
        }).done(function (fss) {
            if (bHidePublic) {
                fss = $.grep(fss, function (fs, i) {
                    return fs.AppId != Nagu.App.Public;
                });
            }
            var cIds = [];
            $.each(fss, function (i, fs) {
                cIds.push(fs.Subject.ConceptId);
            });

            Nagu.CM.bulkGet(cIds.distinct(), {
                keys: currentSiteSetting.keys
            }).done(function (cs) {
                cs.sort(currentSiteSetting.sortConcepts);
                $('#contactList').conceptList(cs, {
                    clearBefore: true,
                    renderItem: function (c, li) {
                        li.addClass('forward').appendMorpheme(c);
                        li.find('a').attr('href', '#contact');

                        li.find('a').unbind('click').click(function () {
                            // 另外打开一个页面可以获取准确的URL地址，但影响性能。
                            //location = '?id=' + fs.Subject.ConceptId;
                            showContact(c.ConceptId);

                            //设置数据
                            //$('#contact').data('conceptId', c.ConceptId);
                        });
                    }
                });
            });
        });
    });
    
}

function showContact(cid) {

    // 显示标题
    $('#contact h1').appendConcept(cid, { container: $('#contact h1') });
    //Nagu.CM.get(cid).done(function (c) {
    //    document.title = c.FriendlyNames[0] + '@纳谷通讯录';
    //});

    // 清除各个固定字段的值
    var as = $('#itemList li a').size();
    $.each($('#itemList li a'),function(i,a){
        $(a).text('');
    });

    // 初始化显示样式
    $('#itemList').find('li').hide();
    $('#itemList').find('.nagu-loading').show();

    // 显示各个固定数据字段
    Nagu.CM.pvsFromType(cid, Nagu.Contact.Class).done(function (pvs) {

        var hasData = false;
        $.each(pvs, function (i, pv) {
            var li = $('#property_' + pv.Key);
            if (li.size() == 0) return;

            // 如果存在属性值，则显示。
            if (pv.Value.length > 0) {
                li.show();
                hasData = true;
                li.find('a').text(pv.Value[0].Object.Value).attr('href','#item');
                li.unbind().click(function () {
                    showItem(pv.Key, pv, cid);
                });
            //} else {
            //    li.find('a').append($('<font/>').attr('color', 'gray').text('点击添加'))
            //                .attr('href', '#addPv');
            //    li.unbind().click(function () {
            //        //window.location = '#home';
            //    });
            }
        });
        if (!hasData) {
            $('#itemList .nagu-none').show();
        }
        $('#itemList').find('.nagu-loading').hide();
    });

    // 显示“下级联系人”列表
    $('#contact_sub').hide();
    $('#contact_sub').find('ul').empty();
    Nagu.SM.findByPO(Nagu.Contact.BelongsTo, cid, Nagu.MType.Concept).done(function (fss) {
        if (fss.length == 0) return;

        $('#contact_sub').show();
        var cIds = [];
        for (var i = 0; i < fss.length; i++) {
            cIds.push(fss[i].Subject.ConceptId);
        }
        Nagu.CM.bulkGet(cIds.distinct()).done(function (cs) {
            cs.sort(currentSiteSetting.sortConcepts);
            $('#contact_sub ul').conceptList(cs, {
                clearBefore: true,
                renderItem: function (c, li) {
                    li.addClass('forward').appendMorpheme(c);
                    li.find('a').attr('href', '#contact')
                        .unbind('click').click(function () {
                        history.push(cid);
                        showContact(c.ConceptId);
                    });
                }
            });
        });
    });
    // 显示“其他信息”
    $('#btnGoConcept').attr('href', '/apps/public/concept.html?id=' + cid);
}

function showItem(propertyId, pv, cid) {
    $('#item h1').appendConcept(propertyId, { container: $('#item h1') });
    $('#item').appendConcept(cid, { container: $('#item .toolbar a') });
    var canDial = false;
    if (propertyId == Nagu.Contact.CellPhoneNum
        || propertyId == Nagu.Contact.OfficeNum)
        canDial = true;

    $('#itemValues').empty();
    $.each(pv.Value, function (i, fs) {
        var li = B.li().appendTo($('#itemValues'));
        var a = B.a().appendTo(li);
        a.appendMorpheme(fs.Object);
        if (canDial && fs.Object.Value)
            a.attr('href', 'tel:' + fs.Object.Value);

        var div = B.div().appendTo(li);
        var starImg = B.img().attr('src', '/Content/Images/glyphicons/glyphicons_048_dislikes.png');
        div.append(B.a().append(starImg));
    });
}

function goBack() {
    if (history.length) {
        showContact(history.pop());
    } else {
        jQT.goBack('#home');
    }
}