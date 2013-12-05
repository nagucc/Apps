var dlgSelectAddress;

$(function () {
    dlgSelectAddress = new SelectAddressDialog({
        selected: dlgSelectAddress_selected
    });
});


function dlgSelectAddress_selected(address, appId) {
    var addId;
    var addBtn = $('#address');
    if (address.street) {
        addBtn.text(address.street);
    } else if (address.country) {
        addId = address.country;
    } else if (address.town) {
        addId = address.town;
    } else if (address.county) {
        addId = address.county;
    } else if (address.city) {
        addId = address.city;
    } else if (address.provice) {
        addId = address.provice;
    } else {
    }

    if (addId) {
        addBtn.text('加载中...');
        Nagu.CM.get(addId).done(function (c) {
            addBtn.text(c.FriendlyNames.sort(function (a, b) {
                return a.length - b.length;
            })[0]);
        });
    }
}