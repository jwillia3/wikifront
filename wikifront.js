indexUrl = 'http://en.wikipedia.org/w/index.php?action=raw&title=';
linkBase = 'http://en.wikipedia.org/wiki/';

function renderWiki(name, wiki) {
    // See http://www.mediawiki.org/wiki/Markup_spec#Parser_outline
    function todo(all) {
        return '<span style=color:white;background:red> ... </span>';
    }
    var extracts = [];
    function makeWikiLink(url, name) {
        return '<a title="' + url + '" onclick=wikiClickHandler() ' +
            ' href=' + linkBase + encodeURIComponent(url) + '>' +
            name + '</a>';
    }
    function makeExternalLink(href, name) {
        return '<a class=external href=' + href + '>' + name + '</a>';
    }
    function preprocessStep(wiki) {
        var replacements = [];
        var nReplacements = 0;
        var leaf = '<span class=wingding>&#x0096;</span>';
        function handleTemplates(all, wiki) {
            var part = wiki.split('|');
            part[0] = part[0].toLowerCase().trim();
            
            switch (part[0]) {
            case 'about':
                return makeWikiLink(part[0] + ' (disambiguation)',
                    leaf +
                    'This article is about ' + part[1] +
                    '. For other uses, see ' +
                        name + ' (Disambiguation).');
            case 'citation needed': //TODO citations
                return '<sup>Citation Needed</sup>';
            case 'lowercase': //TODO what is this?
                return '';
            case 'not a typo': //TODO citations
                return part.slice(1).join('|');
            case 'portal':
            case 'wikibooks':
                return makeWikiLink(part[1],
                    leaf + part[1] + ' ' + part[0]);    
            case 'r': // TODO short references?
                return '<sup>See ' + part[1] + '</sup>';
            case 'reflist': // TODO reflist
                return '';
            case 'start date and age':
                return part[1];
            default:
                if (/-stub$/i.test(wiki)) // ignore stubs
                    return '';
                if (/^cite/i.test(wiki)) // ignore stubs
                    return '<aside class=citation>' +
                        wiki.split('\n|').map(function(row) {
                            row = row.split(/ *= */);
                            row[0] = row[0].toLowerCase().trim();
                            if (row.length != 2) return '';
                            return row[0] == 'title'? '<b>' + row[1] + '</b>':
                                row[0] == 'quote'? '<i>' + row[1] + '</i>':
                                row[0] == 'url'? '<a href=' + row[1] + '>' + row[1] + '</a>':
                                row[0] == 'accessdate'? '':
                                row[1];
                        }).join('<br>') + '</aside>';
                if (/commands$/.test(wiki))
                    return makeWikiLink(wiki, leaf + wiki);
                if (/^infobox/i.test(wiki))
                    return '<aside><table>' +
                        wiki.split('\n|').map(function(row) {
                            row = row.split(/ *= */);
                            return row.length == 2?
                                '<tr><td>' + row[0] + '</td><td>' + row[1] + '</td></tr>':
                                '';
                        }).join('') + '</table></aside>';
            }
            console.info('Template:', part[0]);
            return todo(wiki); //TODO: handle templates
        }
        function replace(all, wiki) {
            replacements.push(handleTemplates(all, wiki));
            nReplacements++;
            return '\x1a' + String.fromCharCode(replacements.length - 1);
        }
        function expand(subst) {
            var i = subst.charCodeAt(1);
            nReplacements++;
            //TODO Fix embedded expansion of {{...}}
            replacements[i] = replacements[i].replace(/\x1a./mg, expand);
            return replacements[i];
        }
        
        wiki = wiki
            .replace(/<!--[^]*?-->/mg, '') // strip HTML comments
            //TODO: Subst
            //TODO: MSG, MSGNW, RAW
        // Templates can be nested
        // Loop through the string replacing any templates with no children
        // Process them and add them to the replacement list
        // Output ASCII SUB and the index as two characters
        // (e.g. \x1a\x01) for the second substitution to happen.
        // Once all substitutions have been made, replace the SUB codes
        // with the generated text.
        do {
            nReplacements = 0;
            wiki = wiki.replace(/\{\{([^{}]+?)}}/mg, replace);
        } while (nReplacements);
        wiki = wiki.replace(/\x1a./mg, expand);
        return wiki;
    }
    function extractStep(wiki) {
        function handleExtraction(all, nowiki) {
            extracts.push(nowiki);
            return '\x1a' + String.fromCharCode(extracts.length - 1);
        }
        return wiki
            .replace(/<nowiki>([^]*?)<\/nowiki>/mg, handleExtraction)
            .replace(/<pre>([^]*?)<\/pre>/mg, handleExtraction)
            .replace(/<math>([^]*?)<\/math>/mg, handleExtraction)
    }
    function reintroductionStep(wiki) {
        function handleReintroduction(subst) {
            return extracts[subst.charCodeAt(1)];
        }
        return wiki.replace(/\x1a./mg, handleReintroduction);
    }
    function internalStep(wiki) {
        function handleHeader(all, level, text) {
            return '<h' + level.length + '>' + text + '</h' + level.length + '>';
        }
        function handleWikiLink(all, body) {
            var part = body.split('|');
            return part.length == 1? makeWikiLink(part[0], part[0]):
                part.length == 2? makeWikiLink(part[0], part[1]):
                makeWikiLink(part[0], part[0]); //TODO: wikilinks
        }
        function handleExternalLink(all, body) {
            var split = body.indexOf(' ');
            var url = split != -1? body.substring(0, split): body;
            var name = split != -1? body.substring(split + 1): url;
            return makeExternalLink(url, name);
        }
        return wiki
            .replace(/^(=+)(.+?)=+/mg, handleHeader)
            .replace(/'''''(.+?)'''''/mg, '<b><i>$1<i></b>')
            .replace(/'''(.+?)'''/mg, '<b>$1</b>')
            .replace(/''(.+?)''/mg, '<i>$1</i>')
            .replace(/\[\[\[(.+?)]]]/mg, todo) //TODO: unknown link
            .replace(/\[\[(.+?)]]/mg, handleWikiLink)
            .replace(/\[(.+)?]/mg, handleExternalLink)
            .replace(/__.+?__/mg, '') // ignore magic words
    }
    function blockStep(wiki) {
        function handleList(all) {
            return '<ul>' +
                all.split('\n').map(function(line) {
                    //TODO: handle nested lists
                    return '<li>' + line.replace(/[*#:;]+/, '');
                }) + '</ul>';
        }
        return wiki
            .replace(/^( .*)+/gm, '<pre>$1</pre>')
            .replace(/(?:^$)+/gm, '<p>')
            .replace(/^(?:[*#:;]+.*?$)+/gm, handleList)
    }
    
    
    wiki = preprocessStep(wiki);
    wiki = extractStep(wiki);
    wiki = internalStep(wiki);
    wiki = blockStep(wiki);
    wiki = reintroductionStep(wiki);
    wiki = wiki
        .replace(/<\/a>s/gm, 's</a>') // Fix pluralisation
        .replace(/<br>(\s*<br>)+/gm, '<br>')
    return wiki;
}

function openPage(name, target) {
    var dom = document.querySelector(target || '#main');
    var origin = window.location.host? '&origin=http://' + window.location.host: '';
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.open('GET', indexUrl + encodeURI(name) + origin , true);
    xhr.setRequestHeader('Api-User-Agent', 'wikifront/1.0');
    xhr.setRequestHeader('Accept', 'text/x-wiki');
    xhr.onreadystatechange = function() {
        if (this.readyState != this.DONE) return;
        dom.querySelector('.title').innerHTML = name;
        if (this.status != '200') {
            dom.querySelector('.copy').innerHTML = name;
        }
        dom.querySelector('.copy').innerHTML = renderWiki(name, this.responseText);
        window.scrollTo(0, 0);
    }
    xhr.send();
}
function wikiClickHandler() {
    openPage(event.target.title);
    event.preventDefault();
}
function handleSearchEnter() {
    if (event.keyCode == 13)
        openPage(this.value);
}

function main() {
    document.querySelector('#search').onkeydown = handleSearchEnter;
    openPage('sed');
}
document.addEventListener('DOMContentLoaded', main);