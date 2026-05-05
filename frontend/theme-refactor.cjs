const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(dirPath);
        }
    });
}

const srcDir = path.join(__dirname, 'src');

walkDir(srcDir, function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
        let original = fs.readFileSync(filePath, 'utf8');
        let content = original;

        // Backgrounds
        content = content.replace(/bg-\[#111111\]\/80 backdrop-blur-md/g, 'bg-white/80 dark:bg-[#111111]/80 backdrop-blur-md');
        content = content.replace(/bg-\[#111111\]\/70 backdrop-blur-md/g, 'bg-white/70 dark:bg-[#111111]/70 backdrop-blur-md');
        content = content.replace(/bg-\[#111111\]/g, 'bg-white dark:bg-[#111111]');
        content = content.replace(/bg-\[#0a192f\]/g, 'bg-slate-50 dark:bg-[#0a192f]');
        content = content.replace(/bg-\[#050b14\]/g, 'bg-slate-100 dark:bg-[#050b14]');
        
        // Borders
        content = content.replace(/border-slate-800/g, 'border-slate-200 dark:border-slate-800');
        content = content.replace(/border-slate-700/g, 'border-slate-300 dark:border-slate-700');
        
        // Text
        content = content.replace(/text-slate-400/g, 'text-slate-600 dark:text-slate-400');
        content = content.replace(/text-slate-300/g, 'text-slate-700 dark:text-slate-300');
        content = content.replace(/text-slate-200/g, 'text-slate-800 dark:text-slate-200');
        
        // Specifically fix the text-white that was replacing text-surface-900 (mostly in headers and drop-shadows)
        content = content.replace(/text-white font-bold drop-shadow-md/g, 'text-slate-900 dark:text-white font-bold drop-shadow-md');
        content = content.replace(/text-white placeholder:text-slate-500/g, 'text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500');

        // Cleanup duplicates just in case
        content = content.replace(/bg-white dark:bg-white dark:bg-\[#111111\]/g, 'bg-white dark:bg-[#111111]');
        content = content.replace(/text-slate-600 dark:text-slate-600 dark:text-slate-400/g, 'text-slate-600 dark:text-slate-400');

        if (content !== original) {
            fs.writeFileSync(filePath, content);
            console.log('Fixed:', filePath);
        }
    }
});
