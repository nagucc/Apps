var jQT, curGroup, wxmId, curContact;

// 指示是否隐藏公共联系人
var bHidePublic = true;

// 用于访问特定微信应用资源的Key，这里应该是一个只读Key。
var gKey;

// 描述联系人主从关系的表：
var contactsMS = new Array();

var dtdMe;

jQuery.fn.center = function () {
    this.css("position", "absolute");
    this.css("top", ($(window).height() - this.height()) / 2 + $(window).scrollTop() + "px");
    this.css("left", ($(window).width() - this.width()) / 2 + $(window).scrollLeft() + "px");
    return this;
}


$(function () {

    jQT = new $.jQTouch({
        icon: 'jqtouch.png',
        icon4: 'jqtouch4.png',
        addGlossToIcon: false,
        startupScreen: 'jqt_startup.png',
        statusBar: 'black-translucent',
        preloadImages: ['images/startup.png']
    });

    // 显示启动页面
    $('#startup').center();

    curContact = getRequest()['id'];
    wxmId = getRequest()['wxm'];
    gKey = getRequest()['gkey'];

    dtdMe = Nagu.MM.getMe();

    // 如果指定了ContactId，则直接显示Contact
    if (curContact) {
        //showGroup(curGroup);
        showContact(curContact);
    } else {
        // 如果没有指定，则显示用户收藏（BelongTo）的联系人
        showContactList();
    }

    $.when(dtdMe).then(function (me) {
        if (me.ret == 0) {
            $('#btnLogin').hide();
        } else {
            $('#btnLogin').show();
        }
    });
});

function showContactList() {
    // 切换div显示
    $('.current').removeClass('current');
    $('#home').addClass('current');

    $.when(dtdMe).then(function (me) {
        if (me.ret != 0) return;

        var gid = me.Id;
        // 显示当前用户收藏的联系人
        Nagu.SM.findByPO(Nagu.Contact.BelongsTo, gid).done(function (fss) {
            if (bHidePublic) {
                fss = $.grep(fss, function (fs, i) {
                    return fs.AppId != Nagu.App.Public;
                });
            }
            $('#contactList').statementList(fss, {
                clearBefore: true,
                renderItem: function (fs, li) {
                    li.addClass('forward').appendMorpheme(fs.Subject);
                    li.find('a').attr('href', '?id=' + fs.Subject.ConceptId)
                        .unbind('click').click(function () {
                            location = '?id=' + fs.Subject.ConceptId;
                        });
                }
            });
        });
    });
    
}

function showGroup(gid) {
    $('#home h1').appendConcept(gid, { container: $('#home h1') });

    // 显示组内联系人
    Nagu.SM.findByPO(Nagu.Contact.BelongsTo, gid).done(function (fss) {
        if (bHidePublic) {
            fss = $.grep(fss, function (fs, i) {
                return fs.AppId != Nagu.App.Public;
            });
        }
        $('#contactList').statementList(fss, {
            clearBefore: true,
            renderItem: function (fs, li) {
                li.addClass('forward').appendMorpheme(fs.Subject);
                li.find('a').attr('href', '#contact').click(function () {
                    showContact(fs.Subject.ConceptId);
                });
            }
        });
    });
    
}

function showContact(cid) {
    // 切换div显示
    $('.current').removeClass('current');
    $('#contact').addClass('current');

    // 显示标题
    $('#contact h1').appendConcept(cid, { container: $('#contact h1') });

    // 设置“返回”按钮
    // 如果不存在主从关系，则设置返回“群组”首页。
    //if (contactsMS[cid] === undefined) {
    //    $('#contact .back').unbind().attr('href', '#home');
    //} else {
    //    $('#contact .back').unbind().attr('href', '#contact').click(function () {
    //        showContact(contactsMS[cid]);
    //    });
    //}
    
    // 清除各个固定字段的值
    var as = $('#itemList li a').size();
    $.each($('#itemList li a'),function(i,a){
        $(a).text('');
    });

    // 初始化显示样式
    //$('#contactFixedInfo').hide();
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
    $('#contact_subGroup').hide();
    $('#contact_subGroup').find('ul').empty();
    Nagu.SM.findByPO(Nagu.Contact.BelongsTo, cid, Nagu.MType.Concept).done(function (fss) {
        if (fss.length == 0) return;

        // 维护"联系人"主从关系表
        $.each(fss, function (i, fs) {
            contactsMS[fs.Subject.ConceptId] = cid;
        });
        $('#contact_subGroup').show().statementList(fss, {
            clearBefore: true,
            renderItem: function (fs, li) {
                li.addClass('forward').appendMorpheme(fs.Subject);
                li.find('a').attr('href', '#contact').click(function () {
                    showContact(fs.Subject.ConceptId);
                });
            }
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