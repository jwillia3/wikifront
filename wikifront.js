indexUrl = 'http://en.wikipedia.org/w/index.php?action=raw&title=';
linkBase = 'http://en.wikipedia.org/wiki/';

function renderWiki(name, wiki) {
    var mode = '';
    var citation = 0;
    var i, m;
    
    function formatWikiLink(all, link, text) {
        return '<a title="' + link + '" onclick=wikiClickHandler() ' +
            'href=' + linkBase + encodeURI(link) + '>' +
            (text || link) + '</a>';
    }
    function formatExternalLink(all, link, text) {
        return '<a href=' + link + '>' + (text || link) + '</a>';
    }
    function formatImage(all, link, size, text) {
        return '<aside style=width:' + size + '>' +
            ' <img src=' + linkBase + 'File:' + (link || '').replace(/ /g, '_') + '>' +
            text + '</aside>';
    }
    function formatDisambiguation(all, about) {
        return 'This article is about ' +
            name + (about? ' ' + about: '') + 
            '. For other uses see ' +
            formatWikiLink(null, name + ' (disambiguation)', name + ' (disambiguation)') + '.';
    }
    function formatReference(key, value) {
        return key == 'url'? '<a href=' + value + '>Link</a>':
            key == 'title'? '<b>' + value + '</b>':
            key == 'accessdate'? '':
            key == 'quote'? '<quote class=cite>' + value + '</quote>':
            value + '<br>';
    }
    function renderField(field) {
        return field
            // Magic Words
            // ISBN, RFC, PMID, Magic Links etc.
            // {{VARIABLE}}
            .replace(/~*/g, '') // user names
            .replace(/\[\[([^|\]]+?)\|([^|\]]+?)\|([^|\]]+?)]]()/g, formatWikiLink)
            .replace(/\[\[([^|\]]+?)\|([^|\]]+?)]]()/g, formatWikiLink)
            .replace(/\[\[(.+?)]]()()/g, formatWikiLink)
            .replace(/\[([^ ]+) (.*)]/g, formatExternalLink)
            .replace(/'''(.*?)'''/g, '<b>$1</b>')
            .replace(/''(.*?)''/g, '<i>$1</i>')
            .replace(/\{\{start date and age\|(.*?)}}/g, '$1')
            .replace(/{{Citation needed.*?}}/ig, '<sup>[Citation Needed]</sup>')
            .replace(/{{About\|(.*?)}}/ig, formatDisambiguation)
            .replace(/{{r\|reader}}/g, '')
    }
    function renderLine(line) {
        return !line? setMode() + '<p>':
            /^----/.test(line)? setMode() + '<hr>':
            /{{Infobox/.test(line)? setMode('infobox'):
                mode=='infobox' && (m = /^ *\| *([^=]+) *= *(.+)$/.exec(line))?
                    '<tr><td>' + renderField(m[1]||'') +
                    '</td><td>' + renderField(m[2]||'') + '</td></tr>':
            /{{cite/.test(line)? setMode('cite'):
                mode=='cite' && (m = /^ *\| *([^=]+) *= *(.+)$/.exec(line))?
                    formatReference(renderField(m[1]), renderField(m[2])):
            /^}}/.test(line)? setMode():
            /^ /.test(line)? setMode('pre') + renderField(line):
            /^\;/.test(line)? '<b>' + renderField(line.substring(1)) + '</b>':
            /^\*/.test(line)? setMode('*') + '<li>' + renderField(line.substring(1)):
            /^#/.test(line)? setMode('#') + '<li>' + renderField(line.substring(1)):
            (m = /^======([^=]+)======$/.exec(line))? setMode() + '<h6>' + m[1] + '</h6>':
            (m = /^=====([^=]+)=====$/.exec(line))? setMode() + '<h5>' + m[1] + '</h5>':
            (m = /^====([^=]+)====$/.exec(line))? setMode() + '<h4>' + m[1] + '</h4>':
            (m = /^===([^=]+)===$/.exec(line))? setMode() + '<h3>' + m[1] + '</h3>':
            (m = /^==([^=]+)==$/.exec(line))? setMode() + '<h2>' + m[1] + '</h2>':
            (m = /^=([^=]+)=$/.exec(line))? setMode() + '<h1>' + m[1] + '</h1>':
            setMode() + renderField(line);
    }
    function setMode(newMode) {
        var same = mode == newMode;
        var prefix =
            same? '':
            mode == 'table'? '</table>':
            mode == 'infobox'? '</table></aside>':
            mode == 'cite'? '</aside>':
            mode == 'pre'? '</pre>':
            mode == '*'? '</ul>':
            mode == '#'? '</ol>':
            '';
        
        if (newMode == 'cite' && !same)
            citation++;
            
        mode = newMode || '';
        
        return prefix + (
            same? '':
            mode == 'table'? '<table>':
            mode == 'infobox'? '<aside><table>':
            mode == 'cite'? '<sup>' + citation + '</sup><aside class=ref>' + citation + '. ':
            mode == 'pre'? '<pre>':
            mode == '*'? '<ul>':
            mode == '#'? '<ol>':
            '');
    }
    
    wiki = wiki
        .replace(/<!--(.|\n)*?-->/g, '')
        .replace(/<[/]?syntaxhighlight/g, '<code')
    
    return wiki.split('\n').map(renderLine).join('\n');
}

function openPage(name, target) {
    var dom = document.querySelector(target || '#main');
    var origin = window.location.host? '&origin=http://' + window.location.host: '';
//    var xhr = new XMLHttpRequest();
//    xhr.withCredentials = true;
//    xhr.open('GET', indexUrl + encodeURI(name) + origin , true);
//    xhr.setRequestHeader('Api-User-Agent', 'wikifront/1.0');
//    xhr.setRequestHeader('Content-Type', 'text/x-wiki; charset=UTF-8');
//    xhr.onreadystatechange = function() {
//        if (this.readyState != this.DONE) return;
//        dom.querySelector('.title').innerHTML = name;
//        if (this.status != '200') {
//            dom.querySelector('.copy').innerHTML = name;
//        }
//        dom.querySelector('.copy').innerHTML = renderWiki(name, this.responseText);
//    }
//    xhr.send();
    $.ajax(indexUrl + encodeURI(name) + origin, {
        async: true,
        accept: 'text/x-wiki/',
        crossDomain: true,
        dataType: 'text',
        headers: { 'Api-User-Agent': 'wikifront/1.0' },
        success: function(text) {
            dom.querySelector('.title').innerHTML = name;
            dom.querySelector('.copy').innerHTML = renderWiki(name, text);
        },
        xhrFields: { withCredentials: true },
    });
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