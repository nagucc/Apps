$(function () {

    Nagu.MM.getMe().done(function (me) {
        if (me.ret == 0) {
            afterNaguLogin(me);
            if (!me.WeixinConnect && me.WeixinOpenId != null) {
                $('wx-not-connect').show();
                $('wx-not-connect').find('a').attr('href',
                    'http://nagu.cc/Member/ConnectFrom/wx?returnUrl=' + window.location.href);
            }
        } else {
            naguLogout();
            $('.nagu-btn-qqlogin').attr('href',
                'http://nagu.cc/Member/QQLogin?ReturnUrl=' + window.location.href);
            if (me.WeixinOpenId != null) {
                $('.nagu-weixin-logout').show();
                $('.nagu-weixin-logout').find('a').attr('href',
                'http://nagu.cc/Member/WeixinLogin?ReturnUrl=' + window.location.href);
            }
        }
    });

    // 初始化“清空缓存”按钮
    $('#btnClearStorage').btnCleanStorage();
});

function createPerson() {

    $("div#{dlgCreatePerson} div.alert").hide();
    ulError = $("div#{dlgCreatePerson} ul.error-list").empty();
    var hasError = false;
    var jiazu = $('div#{dlgCreatePerson}').attr('familyId');
    var fn = $("#tbPersonName").val();
    var desc = $("#tbPersonDesc").val();
    var birthYear = $("#tbBirthYear").val();
    var gender = $("#sGender").val();
    var fatherId = $("#tbFather").attr('personId');
    var motherId = $("#tbMother").attr('personId');

    if (jiazu == "") {
        hasError = true;
        ulError.append(newLi().append("请选出待创建成员所在的家族"));
    }
    if (fn == "") {
        hasError = true;
        ulError.append(newLi().append("\"姓名\"不能为空"));
    }
    if (desc == "") {
        hasError = true;
        ulError.append(newLi().append("\"简介\"不能为空"));
    }
    if (hasError) {
        $("div#{dlgCreatePerson} div.alert").show();
        return;
    }

    $('#btnCreatePerson').attr('disabled', true).text('创建中,请稍候...');
    var pm = new Person();
    pm.create(fn, desc).done(function (person, typeFs) {
        console.log("CreatePersonDialog::添加家族成员成功");
        $("div#{dlgCreatePerson} input").val("");

        var sm = new StatementManager();
        sm.create(person.ConceptId, Nagu.MType.Concept, Person.Properties.SuoZaiJiaZu, jiazu, Nagu.MType.Concept).done(function () {
            console.log("CreatePersonDialog::添加成员所在家族成功");
        });
        sm.create(person.ConceptId, Nagu.MType.Concept, Person.Properties.Gender, gender, Nagu.MType.Concept).done(function () {
            console.log("CreatePersonDialog::添加成员性别成功");
        });
        if (birthYear != "") {
            sm.create(person.ConceptId, Nagu.MType.Concept, Person.Properties.BirthYear, birthYear, Nagu.MType.Literal);
            console.log("CreatePersonDialog::添加成员出生年份成功");
        }
        if (fatherId != "") {
            sm.create(person.ConceptId, Nagu.MType.Concept, Person.Properties.HasFather, fatherId, Nagu.MType.Concept);
            console.log("CreatePersonDialog::添加成员父亲成功");
            $('#fatherH4').hide();
            $('#fatherResult').hide();
        }
        if (motherId != "") {
            sm.create(person.ConceptId, Nagu.MType.Concept, Person.Properties.HasMother, motherId, Nagu.MType.Concept);
            console.log("CreatePersonDialog::添加成员母亲成功");
            $('#motherH4').hide();
            $('#motherResult').hide();
        }
        CreatePersonDialog.prototype.added(person);
        $("div#{dlgCreatePerson}").modal('hide');
        $('#btnCreatePerson').attr('disabled', false).text('创建');
    });
}