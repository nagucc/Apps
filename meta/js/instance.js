function showInstancesByType(type) {
    var sm = new StatementManager();
    return sm.findByPO(NaguConcepts.RdfType, type, MorphemeType.Concept).done(function (fss) {
        return $("#classes").statementList(fss.slice(0, 10),
        {
            renderItem: function (statement, li) {
                // 在页面左边以胶囊按钮的方式展示实例列表
                return renderMorpheme2(statement.Subject, li).done(function (c) {
                    var ss = new SaidStatus(li.attr('statementId'));
                    li.find('a').prepend(ss.getSpan());
//                    li.find('a').attr('ConceptId', c.ConceptId).click(conceptBtn_onClick);
                });
            }
        });
    });
}

function showInstanceById(id) {
    var ul = $('#classes');
    var li = newLi().addClass("statement-list-item");
    ul.append(li);

    var cm = new ConceptManager();
    return cm.get(id).done(function (concept) {
        return renderMorpheme2(concept, li).done(function (c) {
            var ss = new SaidStatus(li.attr('statementId'));
            li.find('a').prepend(ss.getSpan());
            //                    li.find('a').attr('ConceptId', c.ConceptId).click(conceptBtn_onClick);
            //                    if (curClassId == c.ConceptId) li.find('a').click();
        });
    });
    
}