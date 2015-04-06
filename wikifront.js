indexUrl = 'http://en.wikipedia.org/w/index.php?action=raw&title=';
linkBase = 'http://en.wikipedia.org/wiki/';

function renderWiki(name, wiki) {
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
    
    console.clear();
    console.log(wiki);
    
    var mode = '';
    var i, m;
    var disambiguation = 'This article is about ' +
        name + '$1. For other uses see ' +
        formatWikiLink(null, name, name + ' (disambiguation)');
    wiki = wiki
//        .replace(/{{about|(.*?)}}/g, disambiguation)
//        .replace(/\[\[Image:(.+?)\|thumb|(.+?)\|(.+?)]]/g, formatImage)
        .replace(/{{{(.|\n)+?}}}/g, '')
        .replace(/{{(.|\n)+?}}/g, '')
        .replace(/<!--(.|\n)*?-->/g, '')
    
    var lines = wiki.split('\n').map(function(line) {
        line = line
            // Magic Words
            // ISBN, RFC, PMID, Magic Links etc.
            // {{VARIABLE}}
            .replace(/~*/g, '') // user names
            .replace(/^======([^=]+)======$/, '<h6>$1</h6>')
            .replace(/^=====([^=]+)=====$/, '<h5>$1</h5>')
            .replace(/^====([^=]+)====$/, '<h4>$1</h4>')
            .replace(/^===([^=]+)===$/, '<h3>$1</h3>')
            .replace(/^==([^=]+)==$/, '<h2>$1</h2>')
            .replace(/^=([^=]+)=$/, '<h1>$1</h1>')
            .replace(/\[\[(.+?)\|(.+?)\|(.+?)]]/g, formatWikiLink)
            .replace(/\[\[(.+?)\|(.+?)]]()/g, formatWikiLink)
            .replace(/\[\[(.+?)]]()()/g, formatWikiLink)
            .replace(/\[([^ ]+) (.*)]/g, formatExternalLink)
            .replace(/'''(.*?)'''/g, '<b>$1</b>')
            .replace(/''(.*?)''/g, '<i>$1</i>')
            
            
        if (!line)
            return '<p>';
        if (/^----/.test(line))
            return '<hr>';
        if (line[0] == ' ') {
            mode = 'pre';
            return (mode? '': '<pre>\n') + line;
        }
        if (m = /^([*#]+) (.*)$/.exec(line)) {
            return '<li>\n' + m[2];
        }
        return line;
    });
    console.log(lines.join('\n'));
    return lines.join('\n');
}

function openPage(name, target) {
    var dom = document.querySelector(target || '#main');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', indexUrl + encodeURI(name), true);
    xhr.onreadystatechange = function() {
        if (this.readyState != this.DONE) return;
        dom.querySelector('.title').innerHTML = name;
        if (this.status != '200') {
            dom.querySelector('.copy').innerHTML = name;
        }
        dom.querySelector('.copy').innerHTML = renderWiki(name, this.responseText);
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
    openPage('Adobo');
}
document.addEventListener('DOMContentLoaded', main);