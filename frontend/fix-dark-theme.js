const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir(pagesDir, function(filePath) {
    if (filePath.endsWith('.tsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Backgrounds
        content = content.replace(/bg-white rounded-2xl shadow-2xl/g, 'bg-[#0a192f]/95 backdrop-blur-3xl border border-[#00b8d4]/30 rounded-3xl shadow-[0_0_40px_rgba(0,184,212,0.15)]');
        content = content.replace(/bg-white/g, 'bg-[#111111]/80 backdrop-blur-md border border-slate-800/50');
        content = content.replace(/bg-surface-50/g, 'bg-[#050b14]');
        content = content.replace(/bg-surface-100/g, 'bg-[#0a192f]');
        content = content.replace(/bg-surface-200/g, 'bg-slate-800');
        
        // Text Colors
        content = content.replace(/text-surface-900/g, 'text-white font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]');
        content = content.replace(/text-surface-800/g, 'text-slate-200');
        content = content.replace(/text-surface-700/g, 'text-slate-300');
        content = content.replace(/text-surface-600/g, 'text-slate-400');
        content = content.replace(/text-surface-500/g, 'text-[#00b8d4] font-medium');
        content = content.replace(/text-surface-400/g, 'text-slate-500');
        
        // Borders
        content = content.replace(/border-surface-100/g, 'border-slate-800');
        content = content.replace(/border-surface-200/g, 'border-slate-700');
        
        // Primary text mapping (in case it was using text-primary for text, make it pop)
        content = content.replace(/text-primary-600/g, 'text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]');
        content = content.replace(/text-primary-700/g, 'text-white');
        
        // Primary backgrounds (like badge backgrounds)
        content = content.replace(/bg-primary-50/g, 'bg-[#00b8d4]/10');
        
        fs.writeFileSync(filePath, content);
        console.log('Processed:', filePath);
    }
});
console.log('Done!');
