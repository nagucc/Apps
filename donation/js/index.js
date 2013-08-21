var createConceptDialog, dlgLogin;

// url指定的捐款人、捐款对象
var donorId, objectId, donorName;

var dtdDonor = $.Deferred();
Nagu.Donation = {
    Class: '0dbc4a78-3910-4821-bceb-7848219e016e', // 捐款信息类
    Date: '4b28b93a-047f-4de3-959d-006bf85e1847', // 捐款日期
    Donor: 'a3bdaa68-5745-41ca-b0b6-6fbd887a5e7d', // 捐款人
    Object: '7c43542c-7435-4cd8-a0bb-b0ffadee79af', // 捐款对象
    Form: 'e9f93797-9e4d-4594-b751-4f93a495fb38', // 支付方式， form of payment,
    Amount: '058fc028-0b62-4041-8f1c-d43ff2bc763d', // 金额
    Project: '3595f8f7-cfa1-4f84-86cb-524b00e8096f', // 捐助项目
    Note: '118efcc0-949a-4d6f-aa9d-64372eca9267' // 备注
    
}


$(function () {
    
    Nagu.MM.getMe().done(function (me) {
        if (me.ret == 0) {
            afterNaguLogin(me);
        } else {
            naguLogout();
        }
    });

    // 初始化“清空缓存”按钮
    $('#btnClearStorage').btnCleanStorage();

    if ($('#donorName').val() != '') searchDonor();

    donorId = getRequest()['donorId'];
    donorName = getRequest()['donorName'];
    if (donorId !== undefined && donorId != '') {
        doSearch();
        Nagu.CM.get(donorId).done(function (c) {
            $('#donorName').val(c.FriendlyNames[0]);
        });
    } else if (donorName !== undefined && donorName != '') {
        $('#donorName').val(donorName);
    } else {
        // 设置焦点
        $('#donorName').focus();
    }
    objectId = getRequest()['objectId'];
    
});



function searchDonor() {
    var name = $('#donorName').val();
    if ($.trim(name) == '') return;

    dtdDonor = $.Deferred();
    var select = $('#multiDonors').find('select');
    select.empty();
    B.option().text('请选择适当的捐款人').val('').appendTo(select);

    Nagu.CM.search(name).done(function (cs) {
        if (cs.length > 1) {
            $('#multiDonors').show();
            $.each(cs, function (i, c) {
                var option = B.option().text('正在加载...').val(c.ConceptId).appendTo(select);
                Nagu.CM.get(c.ConceptId).done(function (c) {
                    option.text(c.FriendlyNames[0] + '（' + c.Descriptions[0] + '）');
                });
            });
        } else if (cs.length == 1) {
            $('#multiDonors').hide();
            select.empty();
            B.option().val(cs[0].ConceptId).appendTo(select);
        } else {
            select.empty();
        }
        dtdDonor.resolve();
    });
    return dtdDonor.promise();
}

function search() {
    
    $.when(dtdDonor).then(function () {
        var select = $('#multiDonors').find('select');
        if (select.val() == null) {
            alert('未找到“' + $('#donorName').val() + '”的捐款信息');
        } else if (select.val() == '') {
            alert('请先从同名的捐款人中选择一个');
            select.focus();
        } else {
            donorId = select.val();
            doSearch();
        }
    });
}

function doSearch() {
    var table = $('table');
    table.find('tr').slice(1).remove();
    

    Nagu.SM.findByPO(Nagu.Donation.Donor, donorId, Nagu.MType.Concept)
        .done(function (fss) {
            var options = {
                appended: function (cid, a) {
                    a.attr('href', '/apps/public/concept.html?id=' + cid);
                }
            }
            $.each(fss, function (i, fs) {
                var tr = B.tr().appendTo(table);
                B.td().text(i + 1).addClass('hidden-phone').appendTo(tr);
                B.td().text(' ').appendTo(tr);
                var tdDonor = B.td().addClass('hidden-phone').appendTo(tr);
                tdDonor.appendConcept(donorId, options);
                B.td().text(' ').appendTo(tr);
                B.td().text(' ').appendTo(tr);
                B.td().text(' ').appendTo(tr);
                B.td().text(' ').appendTo(tr);

                propertyValuesFormBaseClass(fs.Subject.ConceptId,
                    Nagu.MType.Concept, Nagu.Donation.Class).done(function (pvs) {
                        var td;
                        $.each(pvs, function (j, pv) {
                            switch (pv.Key) {
                                case Nagu.Donation.Date:
                                    td = tr.children().eq(1);
                                    break;
                                case Nagu.Donation.Object:
                                    td = tr.children().eq(3);
                                    break;
                                case Nagu.Donation.Form:
                                    td = tr.children().eq(4).addClass('hidden-phone');
                                    break;
                                case Nagu.Donation.Amount:
                                    td = tr.children().eq(5);
                                    break;
                                case Nagu.Donation.Project:
                                    td = tr.children().eq(6).addClass('hidden-phone');
                                    break;
                                case Nagu.Donation.Note:
                                    td = tr.children().eq(7).addClass('hidden-phone');
                                    break;
                                default:
                                    td = null;
                            }
                            if (td != null && pv.Value.length > 0) {
                                td.empty().appendMorpheme(pv.Value[0].Object, options);
                            }
                        });
                    });
            });
        });
}