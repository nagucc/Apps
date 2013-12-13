var curApp, curUser;

$(function () {

    curApp = getRequest()['id'];
    // 检查用户是否已登录
    Nagu.MM.getMe().done(function (me) {
        if (me.ret == 0) { // 已登录
            afterNaguLogin(me);
            curUser = me.Id;
            listApps();
        } else { // 未登录
            naguLogout();
        }
    })

    $('#btnClearStorage').btnCleanStorage();

    

    // 初始化“创建App”对话框
    $("#dlgNewApp").modal({
        backdrop: true,
        keyboard: true,
        show: false
    });

    // 初始化“创建Key”对话框
    $('#dlgNewKey').modal({
        backdrop: true,
        keyboard: true,
        show: false
    });

    // 初始化“选择Key”对话框
    $('#dlgSelectKey').modal({
        backdrop: true,
        keyboard: true,
        show: false
    }).on('show', function () {
        sltKey_init();
    });
    $('#tbExpireDate').pickadate({
        min: new Date(),
        selectYears: true,
        selectMonths: true
    })
    $('#tbExpireTime').pickatime({
        interval: 180,
        format: 'H:i'
    });
    $('#tbExpireTime').pickatime('picker').set('select',0);

});


function listApps() {
    Nagu.AppM.list().done(function (cs) {
        $('#appList').conceptList(cs, {
            clearBefore: true,
            renderItem: function(app, li){
                li.appendMorpheme(app);
                li.find('a').click(function () {
                    curApp = app.ConceptId;
                    showApp(app.ConceptId);
                    li.siblings().removeClass('active');
                    li.addClass('active');
                    $('#btnDeleteApp').unbind().click(function () {
                        deleteApp(app.ConceptId);
                    });
                });
            }
        });

        if (curApp !== undefined && curApp != '') {
            $('#appList li a[conceptId="' + curApp + '"]').click();
        } else { // 显示第一个项目
            $('#appList li a').first().click();
        }
    });
}

function showApp(appId) {
    $('#appId').text(appId);
    Nagu.AppM.get(appId).done(function (app) {
        $('#appName').text(app.Name);
        $('#appDesc').text(app.Desc);
        $('#managerList').conceptList(app.Managers, {
            clearBefore: true,
            renderItem: function (manager, li) {
                li.appendMorpheme(manager);
                li.find('a').click(function () {
                });
            }
        });
        $('#keyMenu').children().not('.const').remove();
        $.each(app.Keys, function (i, key) {
            var li = B.li().appendTo($('#keyMenu'));
            Nagu.CM.get(key.ConceptId).done(function (ck) {
                li.appendMorpheme(ck);
                li.find('a').attr('data-toggle', 'tab')
                    .attr('href', '#keyInfo')
                    .on('show', function () {
                        Nagu.AppM.getKey(key.ConceptId).done(function (kk) {
                            showKeyInfo(kk);
                        });
                        
                    });
            });
            
        });
        $('.nav-tabs a[href="#home"]').tab('show');
    });
}

function showKeyInfo(key) {
    $('#keyId').text(key.Id);
    $('#keyName').text(key.Name);
    $('#keyDesc').text(key.Desc);
    $('#keyAuth').text(key.Auth);
    
    //var date = new Date(parseInt(key.Expire))
    $('#keyExpire').text(formatJSONDate(key.Expire, 'yyyy-MM-dd hh:mm:ss'));
    
    $('#btnDeleteKey').unbind().click(function () {
        deleteKey(key.Id);
    });
}

function createApp() {
    var fn = $('#tbFn').val();
    var desc = $('#tbDesc').val();
    $("#dlgNewApp .alert ul").empty();
    $('#dlgNewApp .alert').hide();

    // 检查错误
    if (desc == '') {
        $("#dlgNewApp .alert").show();
        $("#dlgNewApp .alert ul").prepend(B.li().text('描述不能为空'));
        $('#tbDesc').focus();
    }
    if (fn == '') {
        $("#dlgNewApp .alert").show();
        $("#dlgNewApp .alert ul").prepend(B.li().text('名称不能为空'));
        $('#tbFn').focus();
    }

    // 创建App
    $('#dlgNewApp button').attr('disabled', 'disabled');
    Nagu.AppM.create(fn, desc).done(function (app) {
        listApps();
        $('#dlgNewApp button').removeAttr('disabled');
    });
    
}

function createKey() {
    var fn = $('#tbKeyFn').val();
    var desc = $('#tbKeyDesc').val();
    var datePicker = $('#tbExpireDate').pickadate('picker');
    var timePicker = $('#tbExpireTime').pickatime('picker');
    var date = datePicker.get('select');
    var time = timePicker.get('select');
    var permisions = $.map(
        $.grep($('#divPermission input'), function (checkBox) {
            return $(checkBox).attr('checked');
        }),
        function (checkBox) {
            return $(checkBox).val();
        });

    // 检查错误
    $("#dlgNewKey .alert ul").empty();
    $('#dlgNewKey .alert').hide();
    if (desc == '') {
        $("#dlgNewKey .alert").show();
        $("#dlgNewKey .alert ul").prepend(B.li().text('描述不能为空'));
        $('#tbKeyDesc').focus();
    }
    if (fn == '') {
        $("#dlgNewKey .alert").show();
        $("#dlgNewKey .alert ul").prepend(B.li().text('名称不能为空'));
        $('#tbKeyFn').focus();
    }
    if (datePicker.get() == '') {
        $("#dlgNewKey .alert").show();
        $("#dlgNewKey .alert ul").append(B.li().text('日期不能为空'));
    }
    if (timePicker.get() == '') {
        $("#dlgNewKey .alert").show();
        $("#dlgNewKey .alert ul").append(B.li().text('时间不能为空'));
    }
    if (permisions.length == 0) {
        $("#dlgNewKey .alert").show();
        $("#dlgNewKey .alert ul").append(B.li().text('至少要选择一个授权'));
    }
    
    var auth = '';
    $.each(permisions, function (i, per) {
        if (auth == '') auth = per;
        else auth = auth + ',' + per;
    });
    var expire = Date.UTC(date.year, date.month, date.date, time.hour);
    Nagu.AppM.addNewKey(curApp, fn, desc, auth, expire).done(function (key) {
        $('#dlgNewKey').modal('hide');
        showApp(curApp);
    });
    
}

function deleteApp(appId) {
    if (window.prompt('输入AppId的前四位字符，以确认删除此App') == appId.substr(0, 4)) {
        $('#btnDeleteApp').attr('disabled', 'disabled');
        Nagu.AppM.delete(appId).done(function (data) {
            if (data.ret == 0) {
                $('#btnDeleteApp').removeAttr('disabled');
                curApp = '';
                listApps();
            }
        });
    } else {
        alert('输入错误，删除操作已被终止。');
    }
}

function deleteKey(keyId) {
    if (window.prompt('输入KeyId的前四位字符，以确认删除此Key') == keyId.substr(0, 4)) {
        $('#btnDeleteKey').attr('disabled', 'disabled');
        Nagu.AppM.deleteKey(curApp, keyId).done(function (data) {
            if (data.ret == 0) {
                $('#btnDeleteKey').removeAttr('disabled');
                showApp(curApp);
            }
        });
    } else {
        alert('输入错误，删除操作已被终止。');
    }
}

function addSelectedKey() {
    var keyId = $('#sltKey').val();
    if (keyId == '') {
        alert('请选择一个Key');
        return;
    }
    Nagu.AppM.addKey(curApp, keyId).done(function (key) {
        $('#dlgSelectKey').modal('hide');
        showApp(curApp);
    });
}

function sltKey_init() {
    var select = $('#sltKey').change(function () {
        $('#sltKeyDesc').text('');
        if($(this).val() == '')return;
        Nagu.CM.get($(this).val()).done(function (key) {
            $('#sltKeyDesc').text(key.Descriptions[0]);
        });
    });
    select.children().not('.const').remove();
    Nagu.AppM.keys().done(function (keys) {
        $.each(keys, function(i, key){
            var opt = B.option()
                .text('加载中...')
                .val(key.ConceptId)
                .appendTo(select);
            Nagu.CM.get(key.ConceptId).done(function (ck) {
                opt.text(ck.FriendlyNames[0]);
            });
        });
    });
}