const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

walkDir(srcDir, function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
        let original = fs.readFileSync(filePath, 'utf8');
        let content = original;
        
        // Fix Backgrounds
        content = content.replace(/bg-white rounded-2xl/g, 'bg-[#111111]/80 backdrop-blur-md border border-slate-800 rounded-2xl');
        content = content.replace(/bg-white/g, 'bg-[#0a192f] border border-slate-700/50');
        content = content.replace(/bg-surface-50/g, 'bg-[#050b14]');
        content = content.replace(/bg-surface-100/g, 'bg-[#0a192f]');
        content = content.replace(/bg-surface-200/g, 'bg-slate-800');
        
        // Fix Icon Backgrounds (The bright white boxes the user mentioned)
        // Usually these are w-10 h-10 bg-primary-50 or bg-white
        content = content.replace(/bg-primary-50/g, 'bg-[#00e5ff]/10');
        content = content.replace(/bg-red-50/g, 'bg-red-500/10');
        content = content.replace(/bg-emerald-50/g, 'bg-emerald-500/10');
        content = content.replace(/bg-violet-50/g, 'bg-violet-500/10');
        content = content.replace(/bg-amber-50/g, 'bg-amber-500/10');
        
        // Fix Text Colors (The black text issue)
        content = content.replace(/text-surface-900/g, 'text-white font-bold drop-shadow-md');
        content = content.replace(/text-surface-800/g, 'text-slate-200');
        content = content.replace(/text-surface-700/g, 'text-slate-300');
        content = content.replace(/text-surface-600/g, 'text-slate-400');
        content = content.replace(/text-surface-500/g, 'text-slate-400');
        content = content.replace(/text-surface-400/g, 'text-slate-500');
        
        // Fix Borders
        content = content.replace(/border-surface-100/g, 'border-slate-800');
        content = content.replace(/border-surface-200/g, 'border-slate-700');
        
        if (content !== original) {
            fs.writeFileSync(filePath, content);
            console.log('Fixed:', filePath);
        }
    }
});
console.log('All files fixed!');
