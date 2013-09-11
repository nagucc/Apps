var jQT, curGroup, wxmId;

// 指示是否隐藏公共联系人
var bHidePublic = true;

// 用于访问特定微信应用资源的Key，这里应该是一个只读Key。
var gKey;

// 描述联系人主从关系的表：
var contactsMS = new Array();

$(function () {
    Nagu.Contact = {
        ContactClass: '5d9a1f44-ab0e-47e0-bb92-ba8b47f5aa42',
        Mobile: 'bd640461-41d2-4009-862e-0ebcd2d77b2c',
        Email: '653a0707-2e03-4e93-937f-6168ddcc6723',
        OfficePhone: '282c7749-1d94-41d2-afa0-45ca4e61b87d',
        BelongsTo: '1ea23591-6d15-4dfb-b32d-3314f60a0a0b',
        SubGroup: 'd5061aa6-c58d-4369-a8c0-9b7fa8825e67'
    };

    jQT = new $.jQTouch({
        icon: 'jqtouch.png',
        icon4: 'jqtouch4.png',
        addGlossToIcon: false,
        startupScreen: 'jqt_startup.png',
        statusBar: 'black-translucent',
        preloadImages: []
    });

    curGroup = getRequest()['id'];
    wxmId = getRequest()['wxm'];
    gKey = getRequest()['gkey'];
    if (curGroup !== undefined && curGroup != null & curGroup != '') {
        showGroup(curGroup);
    }

    Nagu.MM.getMe().done(function (me) {
        if (me.ret == 0) {
            $('#btnLogin').hide();
        } else {
            $('#btnLogin').show();
        }
    });
});

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

    // 显示标题
    $('#contact h1').appendConcept(cid, { container: $('#contact h1') });

    // 设置“返回”按钮
    // 如果不存在主从关系，则设置返回“群组”首页。
    if (contactsMS[cid] === undefined) {
        $('#contact .back').unbind().attr('href', '#home');
    } else {
        $('#contact .back').unbind().attr('href', '#contact').click(function () {
            showContact(contactsMS[cid]);
        });
    }
    
    // 清除各个字段的值
    var as = $('#itemList li a').size();
    $.each($('#itemList li a'),function(i,a){
        $(a).text('');
    });

    // 初始化显示样式
    $('#contactFixedInfo').hide();
    $('#contactFixedInfo').find('li').hide();
    $('#contact_subGroup').hide();
    $('#contact_subGroup').find('ul').empty();
    // 显示各个固定数据字段
    Nagu.CM.pvsFromType(cid, Nagu.Contact.ContactClass).done(function (pvs) {
        $.each(pvs, function (i, pv) {
            var li = $('#property_' + pv.Key);
            if (li.size() == 0) return;

            // 如果存在属性值，则显示。
            if (pv.Value.length > 0) {
                li.show();
                $('#contactFixedInfo').show();
                li.find('a').text(pv.Value[0].Object.Value).attr('href','#item');
                li.unbind().click(function () {
                    showItem(pv.Key, pv, cid);
                });
            } else {
                li.find('a').append($('<font/>').attr('color', 'gray').text('点击添加'))
                            .attr('href', '#addPv');
                li.unbind().click(function () {
                    //window.location = '#home';
                });
            }
        });
    });

    // 显示“下级联系人”列表
    Nagu.SM.findByPO(Nagu.Contact.BelongsTo, cid, Nagu.MType.Concept).done(function (fss) {
        if (fss.length == 0) return;

        // 维护"联系人"主从关系表
        $.each(fss, function (i, fs) {
            contactsMS[fss.Subject.ConceptId] = cid;
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
    if (propertyId == Nagu.Contact.Mobile
        || propertyId == Nagu.Contact.OfficePhone)
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