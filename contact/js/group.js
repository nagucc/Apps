var jQT, curGroup, wxmId;


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
    Nagu.SM.findByPO(Nagu.Contact.BelongsTo, gid).done(function (fss) {
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

    // 清除各个字段的值
    var as = $('#itemList li a').size();
    $.each($('#itemList li a'),function(i,a){
        $(a).text('');
    });

    // 显示各个数据字段
    Nagu.CM.pvsFromType(cid, Nagu.Contact.ContactClass).done(function (pvs) {
        $.each(pvs, function (i, pv) {
            var li = $('#property_' + pv.Key);
            if (li.size() == 0) return;
            if (pv.Value.length > 0) {
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

    // 显示“其他信息”
    $('#btnGoConcept').attr('href', '/apps/public/concept.html?id=' + cid);
    //Nagu.CM.getPropertiesAndValues(cid).done(function (pvs) {
    //    $.each(pvs, function (i, pv) {
    //        // 无属性值则不显示
    //        if (pv.Values.length == 0) return;

    //        var li = B.li().addClass('forward').appendTo($('#otherItemList'));
    //        li.attr('id', 'property_' + pv.Key);
    //        var a = B.a().addClass('itemValue').attr('href', '#item');

    //        // 显示属性名称
    //        Nagu.CM.get(pv.Key.ConceptId).done(function (c) {
    //            li.prepend(c.FriendlyNames[0]);
    //            li.append(a);
    //        });

    //        // 显示属性值
    //        a.text(pv.Value[0].Object.Value).attr('href', '#item');
    //        li.unbind().click(function () {
    //            showItem(pv.Key, pv, cid);
    //        });
    //    });
    //});
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