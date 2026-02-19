Clear-Host
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "    FALCARE KANBAN - ATUALIZACAO DE INTERFACE    " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$nodeScript = @'
const fs = require('fs');
const path = require('path');

function findFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!['node_modules', '.next', 'dist', '.git'].includes(file)) {
        findFiles(filePath, fileList);
      }
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = findFiles('./apps/web');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // --- 1. DASHBOARD: INJETANDO LIXEIRA E FUNÇÃO DE EXCLUSÃO ---
  if ((content.includes('Criar Quadro') || content.includes('Meus Projetos')) && content.includes('.map(') && !content.includes('handleDeleteBoard')) {
    
    // Injeta a comunicação com a API (DELETE)
    content = content.replace(/(return\s*[\(\<])/m, 
`  const handleDeleteBoard = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Atenção: Tem certeza que deseja excluir este quadro permanentemente?')) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(\`\${apiUrl}/boards/\${id}\`, { method: 'DELETE' });
      if (res.ok) {
        window.location.reload(); 
      } else {
        alert('Erro ao excluir. O quadro pode conter tarefas associadas que precisam ser apagadas antes.');
      }
    } catch (error) {
      console.error('Erro na API:', error);
    }
  };

  $1`);

    // Injeta a lixeira ao lado esquerdo do Título do Quadro de forma responsiva
    content = content.replace(/(<(?:h[1-6]|span|p|div|strong|b)[^>]*>)\s*(\{[\w]+\.(?:title|name|nome)\})\s*(<\/(?:h[1-6]|span|p|div|strong|b)>)/g, 
`<div className="flex items-center gap-2">
  <button onClick={(e) => handleDeleteBoard($2.replace('.title', '.id').replace('.name', '.id').replace('.nome', '.id').replace('{', '').replace('}', ''), e)} className="text-slate-300 hover:text-red-500 transition-colors z-20" title="Excluir Quadro">
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
  </button>
  $1$2$3
</div>`);
  }

  // --- 2. TELA DE KANBAN: MODAL CUSTOMIZADO FALCARE ---
  if (content.match(/\bprompt\(/) && !content.includes('falcarePrompt')) {
    const modalScript = `
const falcarePrompt = (message) => {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-6 bg-white rounded-xl shadow-2xl border-t-4 border-blue-500 backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm z-[9999] w-96 m-0';
    dialog.innerHTML = \`
      <h2 class="text-xl font-bold mb-1 text-slate-800">Falcare Kanban</h2>
      <p class="mb-5 text-sm text-slate-500">\${message}</p>
      <input type="text" id="falcare-input" class="w-full border-2 border-slate-200 focus:border-blue-500 outline-none p-3 rounded-lg mb-6 text-slate-800" autocomplete="off" />
      <div class="flex justify-end gap-3">
        <button id="falcare-cancel" class="px-4 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg font-medium transition-colors cursor-pointer">Cancelar</button>
        <button id="falcare-ok" class="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm cursor-pointer">OK</button>
      </div>
    \`;
    document.body.appendChild(dialog);
    dialog.showModal();
    const input = dialog.querySelector('#falcare-input');
    input.focus();
    const close = (val) => { dialog.close(); dialog.remove(); resolve(val); };
    dialog.querySelector('#falcare-ok').onclick = () => close(input.value);
    dialog.querySelector('#falcare-cancel').onclick = () => close(null);
    input.onkeydown = (e) => { if (e.key === 'Enter') close(input.value); };
  });
};
`;
    // Adiciona o script do modal logo após as importações do arquivo
    content = content.replace(/(import\s+.*?;?\s*)+/, `$&${modalScript}`);

    // Primeiro, altera o caption solicitado
    content = content.replace(/Nome da nova etapa:/g, 'Nome da nova tarefa:');

    // Substitui a caixa velha pela nossa função assíncrona
    content = content.replace(/\bwindow\.prompt\(/g, 'await falcarePrompt(');
    content = content.replace(/\bprompt\(/g, 'await falcarePrompt(');

    // Converte os botões React para aceitarem a janela assíncrona
    content = content.replace(/onClick=\{?\s*\(\)\s*=>/g, 'onClick={async () =>');
    content = content.replace(/onClick=\{?\s*\(e\)\s*=>/g, 'onClick={async (e) =>');
    content = content.replace(/onAdd=\{?\s*\(\)\s*=>/g, 'onAdd={async () =>');
    content = content.replace(/const\s+(\w+)\s*=\s*\(\)\s*=>\s*\{/g, 'const $1 = async () => {');
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('✅ UI/UX atualizado com sucesso em: ' + file);
  }
});
'@

Set-Content -Path "apply-patch.js" -Value $nodeScript -Encoding UTF8
Write-Host "⚙️ Modificando Telas e Botoes no codigo fonte..." -ForegroundColor Yellow
node apply-patch.js
Remove-Item "apply-patch.js"

Write-Host "=================================================" -ForegroundColor Green
Write-Host "✅ Injeção concluída! Inicie o seu Laboratório." -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green