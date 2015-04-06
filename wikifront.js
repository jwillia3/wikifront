indexUrl = 'http://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&titles=';
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
    window.name = name;
    document.querySelector('#main').querySelector('.title').innerHTML = name;
    var dom = document.createElement('script');
    dom.type = 'text/javascript';
    dom.src = indexUrl + encodeURI(name) + '&format=json&callback=receivedWiki';
    document.head.appendChild(dom);
    console.log(dom);
}
function receivedWiki(json) {
    var wiki = json.query.pages[Object.keys(json.query.pages)].revisions[0]['*'];
    document.querySelector('#main > .copy').innerHTML = renderWiki(name, wiki);
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