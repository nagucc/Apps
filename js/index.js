$(document).ready(function () {
    showApps();
});


function showApps() {
    Nagu.SM.findByPO(Nagu.Rdf.Type, Nagu.Concepts.App, Nagu.MType.Concept).done(function (fss) {
        var ph;
        for (var i = 0; i < fss.length; i++) {
            if (i % 3 == 0) {
                ph = $('<div/>').addClass('row').appendTo($('.marketing'));
            }
            var fs = fss[i];
            var span4 = $('<div/>').addClass('span4').appendTo(ph);
            Nagu.CM.get(fs.Subject.ConceptId).done(function (concept) {
                var img = $('<img/>').attr('src', '/content/images/glyphicons/glyphicons_308_share_alt.png');
                img.addClass('bs-icon').appendTo(span4);
                var h2 = $('<h2/>').text(concept.FriendlyNames[0]).appendTo(span4);
                var p = $('<p/>').append(concept.Descriptions[0]).append($('<br/>')).appendTo(span4);
                var a = $('<a/>').addClass('btn btn-primary').attr('href', '/apps/public/concept.html?id=' + concept.ConceptId);
                a.text('进入 »').appendTo(p);
            });
            
        }
    });
}