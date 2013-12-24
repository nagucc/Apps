var jQT, curGroup, wxmId, curContact;

// 指示是否隐藏公共联系人
var bHidePublic = false;

// 用于访问特定微信应用资源的Key，这里应该是一个只读Key。
var gKey;


var dtdMe, history = [], currentSiteSetting;


function getSettings(host) {
    var defaultSiteSetting = {
        title: '纳谷黄页',
        icon: 'http://nagu.cc/Content/Images/logo80.jpg',
        icon4: 'http://nagu.cc/Content/Images/logo1065.png',
        defaultOwnerId: '20b82ee0-decc-43c6-ac8f-11f008a6c2d1', // 当用户未登录时，显示BelongTo 此OwnerId的数据。
        appId: '20b82ee0-decc-43c6-ac8f-11f008a6c2d1', // 当前应用的AppId
        keys: [
            '566fca71-fb13-4acc-86f1-6982114bfa46' // 云南大学公众黄页只读服务Key
            , '960af7a3-0d5c-477b-a8d7-e4b1ae252d2e' // 行政区划公众服务只读key
        ],
        copyright: '版权所有&copy; 纳谷概念云 <br /> Drived by nagu.cc',
        sortConcepts: function (a, b) {
            return 0;
        },
        prepareConcepts: function (cs) { // 对返回的Concept集合进行筛选
            
            // 1. 排除公共AppId
            var newcs = [];
            $.each(cs, function (i, c) {
                var newc = $.extend(newc,c);
                newc.FriendlyNameFss = $.grep(c.FriendlyNameFss, function (fs) {
                    return fs.AppId != Nagu.App.Public;
                });
                var a;
                if (newc.FriendlyNameFss.length == 0) newc.FriendlyNameFss = [c.FriendlyNameFss[0]];
                var b;
                newc.FriendlyNames = $.map(c.SaidNameFss.concat(newc.FriendlyNameFss), function (fs) {
                    return fs.Object.Value;
                });
                newcs.push(newc);
            });
            cs = newcs;
        },
        // 显示首页中的联系人列表
        showHomeList: function (me, settings) {
            var gid = settings.defaultOwnerId;

            var dtdDefault = $.Deferred(), dtdUser = $.Deferred();

            // 取出用户收藏的联系人
            if (me.ret == 0) {
                gid = me.Id;
                dtdUser = Nagu.SM.findByPO(Nagu.Contact.BelongsTo, me.Id, Nagu.MType.Concept, {
                    keys: settings.keys
                });
            } else {
                dtdUser.resolve([]);
            }


            // 取出公共联系人
            if (bHidePublic) {
                dtdDefault.resolve([]);
            } else {
                dtdDefault = Nagu.SM.findByPO(Nagu.Contact.BelongsTo,
                    settings.defaultOwnerId, Nagu.MType.Concept, {
                        keys: settings.keys
                    });
            }

            // 显示联系人列表
            $.when(dtdDefault, dtdUser).done(function (fss1, fss2) {
                var fss = $.grep(fss1.concat(fss2), function (fs, i) {
                    return fs.AppId != Nagu.App.Public;
                });
                Nagu.CM.bulkGet(Nagu.SM.subjectIds(fss), {
                    keys: settings.keys
                }).done(function (cs) {
                    settings.prepareConcepts(cs);
                    cs.sort(settings.sortConcepts);
                    $('#contactList').conceptList(cs, {
                        clearBefore: true,
                        renderItem: function (c, li) {
                            li.addClass('arrow').appendMorpheme(c);
                            li.find('a').attr('href', '#contact');

                            li.find('a').unbind('click').click(function () {
                                showContact(c.ConceptId);
                            });
                        }
                    });
                });
            });
        },
        showContact: function (me, settings) {
        },
        // 显示下级联系人列表
        showDependentContact: function (masterId, settings) {
            Nagu.SM.findByPO(Nagu.Contact.BelongsTo, masterId, Nagu.MType.Concept).done(function (fss) {
                if (fss.length == 0) return;

                $('#contact_sub').show();
                Nagu.CM.bulkGet(Nagu.SM.subjectIds(fss)).done(function (cs) {
                    settings.prepareConcepts(cs);
                    cs.sort(settings.sortConcepts);
                    $('#contact_sub ul').conceptList(cs, {
                        clearBefore: true,
                        renderItem: function (c, li) {
                            li.addClass('arrow').appendMorpheme(c);
                            li.find('a').attr('href', '#contact')
                                .unbind('click').click(function () {
                                    history.push(masterId);
                                    showContact(c.ConceptId);
                                });
                            li.append($('<small/>').text(c.Descriptions[0]));
                        }
                    });
                });
            });

        }
    };
    switch (host) {
        case 'apps.ynu.edu.cn':
            return $.extend(defaultSiteSetting, {
                defaultOwnerId: '96f3bb22-b850-4604-875a-9af21c16e278', // 云南大学
                title: '云大通讯录',
                appId: '944c4890-a848-44b0-b1d7-a50217cfd405', // 云南大学公众服务
                keys: [
                    '566fca71-fb13-4acc-86f1-6982114bfa46' // 云南大学公众黄页只读服务Key
                ],
                copyright: '版权所有&copy; 云南大学网络与信息中心 <br /> Drived by nagu.cc',
                sortConcepts: function (a, b) {
                    var afn, bfn;
                    var afns = $.grep(a.FriendlyNames, function (fn) {
                        return fn.indexOf('[XB/YNU 001') == 0;
                    });
                    if (afns.length > 0) afn = afns[0]
                    else afn = '[XB/YNU 999';

                    var bfns = $.grep(b.FriendlyNames, function (fn) {
                        return fn.indexOf('[XB/YNU 001') == 0;
                    });
                    if (bfns.length > 0) bfn = bfns[0]
                    else bfn = '[XB/YNU 999';

                    for (var i = 0; i < Math.min(afn.length, bfn.length) ; i++) {
                        if (afn[i] != bfn[i]) return afn[i] - bfn[i];
                    }
                    return afn.length - bfn.length;
                }
            });
        default:
            return defaultSiteSetting;
    }
}

$(function () {
    FastClick.attach(document.body);

    currentSiteSetting = getSettings(location.host);

    document.title = currentSiteSetting.title;
    jQT = new $.jQTouch({
        icon: currentSiteSetting.icon,
        icon4: currentSiteSetting.icon4,
        addGlossToIcon: false,
        startupScreen: 'images/startup.png',
        statusBar: 'black-translucent'
    });

    curContact = getRequest()['id'];
    wxmId = getRequest()['wxm'];
    gKey = getRequest()['gkey'];

    dtdMe = Nagu.MM.getMe();

    if (location.hash == '#feedback' || location.hash == '#login') {
    } else {
        // 如果指定了ContactId，则直接显示Contact
        if (curContact) {
            $('.current').removeClass('current');
            $('#contact').addClass('current');
        } else {
            location.hash = 'home';
        }
    }

    $.when(dtdMe).then(function (me) {
        if (me.ret == 0) {
            $('#btnLogin').hide();
            $('.nagu-logout').hide();
            $('.nagu-logged').show();
        } else {
            $('#btnLogin').show();

            $('.nagu-logout').show();
            $('.nagu-logged').hide();
        }
    });

    // 初始化首页
    showContactList();

    // 初始化登录按钮
    var url = 'http://'+Nagu.hosts[0]+'/Member/';
    $('#btnQQLogin').unbind('click').click(function () {
        location = url + 'QQLogin/?ReturnUrl=' + encodeURIComponent(location.href);
    });
    $('#btnWeiboLogin').unbind('click').click(function () {
        location = url + 'WeiboLogin/?ReturnUrl=' + encodeURIComponent(location.href);
    });

});

function showContactList() {
    
    $('#home h1').text(currentSiteSetting.title);
    $.when(dtdMe).then(function (me) {
        currentSiteSetting.showHomeList(me, currentSiteSetting);
    });
    $('#home').find('.info p').empty().append(currentSiteSetting.copyright);
}

function showContact(cid) {

    

    // 清除各个固定字段的值
    //var as = $('#itemList li a:first').size();
    $.each($('#itemList li a:first'),function(i,a){
        $(a).text('');
    });

    // 初始化显示样式
    $('#itemList').find('li').hide();
    $('#itemList').find('.nagu-loading').show();

    // 显示标题
    Nagu.CM.get(cid).done(function (c) {
        currentSiteSetting.prepareConcepts([c]);
        $('#contact h1').text(c.FriendlyNames[0]);
        $('#contact').find('#contact_desc').text(c.Descriptions[0]).show();
    });

    // 显示各个固定数据字段
    Nagu.CM.pvsFromType(cid, Nagu.Contact.Class, {
        keys: currentSiteSetting.keys
    }).done(function (pvs) {

        var hasData = false;
        $.each(pvs, function (i, pv) {
            var li = $('#property_' + pv.Key);
            if (li.size() == 0) return;

            // 如果存在属性值，则显示。
            if (pv.Value.length > 0) {
                li.show();
                hasData = true;
                li.find('a').first().text(pv.Value[0].Object.Value)
                    .attr('href', '#item')
                    .unbind().click(function () {
                        showItem(pv.Key, pv, cid);
                    });
                if (pv.Key == Nagu.Contact.CellPhoneNum
                    || pv.Key == Nagu.Contact.OfficeNum) {
                    li.find('a').eq(1).attr('href', 'tel:' + pv.Value[0].Object.Value);
                }
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
    currentSiteSetting.showDependentContact(cid, currentSiteSetting);

    // 显示“其他信息”
    $('#btnGoConcept').attr('href', 'http://nagu.cc/apps/public/concept.html?id=' + cid);
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
        var starImg = B.img().attr('src', 'http://nagucdn.sinaapp.com/Content/Images/glyphicons/glyphicons_048_dislikes.png');
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

function sendFeedBack() {
    $.when(dtdMe).then(function (me) {
        if (me.ret == 0) {
            var val = $('#feedback textarea').val()
            if (val) {
                $('#btnSendFeedBack').attr('disabled', 'disabled');
                Nagu.CM.addLiteralPropertyValue(currentSiteSetting.appId, Nagu.Concepts.Remark, val).done(function (fs) {
                    alert('非常感谢');
                    $('#btnSendFeedBack').removeAttr('disabled');
                });
            }
            
        } else {
            alert('请先登录');
            // 初始化登录按钮
            var url = 'http://' + Nagu.hosts[0] + '/Member/';
            $('#btnQQLogin').unbind('click').click(function () {
                location = url + 'QQLogin/?ReturnUrl=' + encodeURIComponent(location.href);
            });
            $('#btnWeiboLogin').unbind('click').click(function () {
                location = url + 'WeiboLogin/?ReturnUrl=' + encodeURIComponent(location.href);
            });

            location.host = 'login';
        }
    });
    
}