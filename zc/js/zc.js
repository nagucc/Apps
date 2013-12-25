var defaultAppId = 'aca9756c-7c11-4128-8ed4-2ab2c43a067f';

var curUser, curConcept;

var Zc = {
    Class: 'e01085bf-a4a2-4ada-b39c-9519c3f25fe4',
    PicUrl: '3d512374-f87d-46f9-bad6-2d81fdbbe440', // 相关图片
    Bh: '9080c5f4-2eb7-444b-8c5e-eb81b68b7ea9', // 编号
    Date: '5f61c37e-8cfb-447d-84ee-ab81c35aca3d', // 购置日期
    Include: '32da0816-a12b-49fd-98b0-158f1ef61f62', // 包含资产
    Fs: '43296bf8-e83f-45fe-8b3c-ec031e2e9b9c', // 附属于
    Location: '9046c121-43e8-4573-a031-680e78170184', // 存放地点
    Glr: '9fdade80-c4a2-4e8c-9d05-a47bf608ae0f', // 管理人
    Lyr: '2d502a3e-c30d-4392-aff7-8c2301c8df55', // 领用人
    BelongTo: 'eff3baf0-a911-456a-9b95-f7c01f6cb6af', // 所属部门
    Guige: 'ba5b04a7-47a2-4624-9708-4b0c79593390', // 规格
    Xinghao: 'b7e744b4-c69c-423a-967c-6710690693a9', // 型号
    Price: '87de68c5-e7b4-453b-9305-eb9834696961', //单价
    Shul: 'a0054203-7a99-46a1-ac1c-d99b72856a99', // 数量
    Zongj: 'c4ce1ec6-3d35-4896-9d4f-bee1263c7202' // 总价

};

function getSettings(host) {
    var defaultSiteSetting = {
        title: '纳谷固定资产助手',
        keys: [],
        prepareConcepts: function (cs) { // 对返回的Concept集合进行筛选

            // 1. 排除公共AppId
            var newcs = [];
            $.each(cs, function (i, c) {
                var newc = $.extend(newc, c);
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
        }
    };

    switch (host) {
        case 'apps.ynu.edu.cn':
            return $.extend(defaultSiteSetting, {
                title: '云南大学固定资产',
                copyright: '版权所有&copy; 云南大学网络与信息中心 <br /> Drived by nagu.cc',
            });
        default:
            return defaultSiteSetting;
    }
}

var curSettings = getSettings(location.host);
$(function () {
    curConcept = getRequest()['id'];

    document.title = curSettings.title;

    // 判断是否登录
    // 检查用户是否已登录
    Nagu.MM.getMe().done(function (me) {
        var page = $('#login');
        
        if (me.ret == 0) { // 已登录
            
            curUser = me.Id;
            showUsedZc();

            if (curConcept === undefined || curConcept == '') {
                location.hash = '#zcList';
            } else {
                location.hash = '#home';
            }
            page.find('h1').text('用户已登录');

        } else { // 未登录
            // 初始化QQ登录按钮
            var url = 'http://' + Nagu.commonOption.host + '/Member/QQLogin?returnUrl=' + window.location.href;
            $('#btnQqLogin').href(url, true);//.attr('href', url);

            // 初始化微博登录按钮
            var url2 = 'http://' + Nagu.commonOption.host + '/Member/WeiboLogin?returnUrl=' + window.location.href;
            $('#btnWeiboLogin').href(url2, true);//.attr('href', url2);

            location.hash = '#login';
        }
    })
    
    if (curConcept && curConcept != '') {
        showZc(curConcept);
    }


});

// 显示当前资产信息
function showZc(id) {
    var page = $('#home');
    

    // 显示标题
    Nagu.CM.get(id).done(function (zcc) {
        curSettings.prepareConcepts([zcc]);
        page.find('h1').text(zcc.FriendlyNames[0]);
        page.data('title', zcc.FriendlyNames[0] + curSettings.title);
        page.attr('data-title', zcc.FriendlyNames[0]);
    });

    // 显示图片
    Nagu.CM.getPropertyValues(id, Zc.PicUrl).done(function (fss) {
        for (var i = 0; i < fss.length; i++) {
            if (fss[i].Object.Value) {
                $('#zcPic').attr('src',fss[i].Object.Value).css('width','100%');
                break;
            }
        }
    });

    // 显示属性值
    Nagu.CM.pvsFromType(id, Zc.Class).done(function (pvs) {
        $.each(pvs, function (i, pv) {
            var vc = page.find("div[vc4p='" + pv.Key + "']");
            if (vc.size() > 0 && pv.Value.length > 0) {
                //显示第一个值
                // 以文本方式显示
                vc.empty().appendMorpheme(pv.Value[0].Object, {
                    appended: function (cid, a) {
                        a.unbind('click').attr('href', 'http://nagu.cc/apps/public/concept.html?id=' + cid)
                            .attr('target', '_blank');
                    }
                });

                // 显示所有值
                //vc.empty();
                //for (var i = 0; i < pv.Value.length; i++) {
                //    B.div().appendTo(vc).appendMorpheme(pv.Value[i].Object);
                //}
            }
        });
    });

    // 设置“修改”按钮的链接
    $('#naguLink').href('http://nagu.cc/apps/public/concept.html?id=' + id + '#type-pane-' + Zc.Class, true);

    // 显示其他类型数据
    Nagu.CM.types(id).done(function (typeFss) {
        $.each(typeFss, function (i, typeFs) {
            var type = typeFs.Object;
            if (type.ConceptId == Zc.Class
                || type.ConceptId == Nagu.Concepts.NaguConcept)
                return;

            // 此处无法使用DOM添加，不知原因。
            var div = $('.zc-type-template').last()
                        .removeClass('zc-type-template ui-screen-hidden');

            // 设置类型名称
            Nagu.CM.get(type.ConceptId).done(function (typeC) {
                div.find('.zc-type-name').text(typeC.FriendlyNames[0]);
            });

            // 生成属性及值列表。
            Nagu.CM.pvsFromType(id, type.ConceptId).done(function (pvs) {
                $.each(pvs, function (i, pv) {
                    var row = B.div().addClass('tablerow').appendTo(div.find('.zc-plist'));
                    var left = B.div().addClass('left-table').appendTo(row);
                    var right = B.div().addClass('right-table').appendTo(row);
                    Nagu.CM.get(pv.Key).done(function (key) {
                        left.appendMorpheme(key);
                    });
                    if (pv.Value.length > 0) {
                        right.appendMorpheme(pv.Value[0].Object);
                    } else {
                        right.text('无属性值');
                    }
                });
            });

        });
    });
}

function showManagedZc() {
    $('#zcList').find('h1').text('我管理的资产');
    showZcList(Zc.Glr);
}

function showUsedZc() {
    $('#zcList').find('h1').text('我领用的资产');
    showZcList(Zc.Lyr);
}

function showZcList(predicate) {

    if (!curUser) {
        alert('请先登录');
        location.hash = '#login';
        return;
    }
    $('#ulItems').find('li:not(#itemTemplate)').remove();
    $('#ulItems').append(B.li().text('正在加载...'));
    Nagu.SM.findByPO(predicate, curUser, Nagu.MType.Concept).done(function (fss) {
        $('#ulItems').find('li:not(#itemTemplate)').remove();
        if (fss.length == 0) {
            $('#ulItems').append(B.li().text('没有找到任何资产'));
            return;
        }
        var cIds = [];
        $.each(fss, function (i, fs) {
            var li = $('#itemTemplate').clone().appendTo($('#ulItems'));
            li.attr('id', 'item-' + fs.Subject.ConceptId).removeAttr('style');
            cIds.push(fs.Subject.ConceptId);
        });
        Nagu.CM.bulkGet(cIds).done(function (cs) {
            $.each(cs, function (i, c) {
                var li = $('#item-' + c.ConceptId);
                li.find('h3').text(c.FriendlyNames[0]);
                li.find('p').text(c.Descriptions[0]);
                li.find('a').href('?id=' + c.ConceptId, true);
                    //.attr('href', '?id=' + c.ConceptId);
            });
        });

        // 获取图片
        $.each(fss, function (i, fs) {
            Nagu.CM.getPropertyValues(fs.Subject.ConceptId, Zc.PicUrl).done(function (fss) {
                for (var i = 0; i < fss.length; i++) {
                    if (fss[i].Object.Value) {
                        var li = $('#item-' + fs.Subject.ConceptId);
                        li.find('img').attr('src', fss[i].Object.Value);
                    }
                }
            });
        });
    });

    
}

// 领用当前资产
function addLy() {
    if (window.confirm('确实要领用当前资产吗？')) {
        Nagu.CM.addConceptPv(curConcept, Zc.Lyr, curUser, {
            appId: defaultAppId
        }).done(function (data) {
            alert('您已领用当前资产，请注意保管。');
        });
    }
}

$.fn.href = function (href, withClick) {
    var a = $(this);
    a.attr('href', href);
    if (withClick) {
        a.click(function () {
            window.location = href;
        });
    }
}