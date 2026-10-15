const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {build, check, releaseVersion, productionFilename} = require('./build.cjs');
const root = __dirname;

function ghEnvironment() {
  const env={...process.env};
  const proxyFile=path.join(root,'.local','github-cli','proxy.json');
  if (fs.existsSync(proxyFile)) {
    const {httpProxy}=JSON.parse(fs.readFileSync(proxyFile,'utf8'));
    assert.equal(typeof httpProxy,'string','Local httpProxy must be a URL string');
    const proxy=new URL(httpProxy);
    assert(['http:','https:'].includes(proxy.protocol),'Local httpProxy must use HTTP or HTTPS');
    env.HTTP_PROXY=httpProxy;
    env.HTTPS_PROXY=httpProxy;
  }
  return env;
}
function run(program, args, {capture=false,env=process.env}={}) {
  const result = spawnSync(program,args,{cwd:root,encoding:'utf8',
    stdio:capture?'pipe':'inherit',timeout:180000,windowsHide:true,env});
  if (result.error?.code==='ENOENT') throw Error(program+' is not installed. Install GitHub CLI and run gh auth login --hostname github.com.');
  if (result.error) throw result.error;
  if (result.status!==0) throw Error(program+' '+args.join(' ')+' failed'+(capture?': '+result.stderr.trim():''));
  return capture?result.stdout.trim():'';
}
function notes(version, sha256) {
  const changelog=fs.readFileSync(path.join(root,'CHANGELOG.md'),'utf8');
  const section=changelog.split(new RegExp('^## '+version+'\\r?\\n','m'))[1]?.split(/^## /m)[0].trim();
  assert(section,'Current changelog entry must contain release notes');
  return section+'\n\n## 文件\n\n'+productionFilename+'\n\nSHA-256: '+sha256+
    '\n\n构建完整性检查通过；真实 PotPlayer 和实时站点行为请按发布验收记录确认。\n';
}
async function main(args=process.argv.slice(2)) {
  assert(args.length<=1 && (!args.length || ['--prepare','--preview'].includes(args[0])),
    'Usage: node release.cjs [--prepare | --preview]');
  const version=releaseVersion();
  if (args[0]==='--prepare') await build({version});
  const report=await check({release:true});
  const notesFile=path.join(root,'verification','release-'+version+'.md');
  fs.writeFileSync(notesFile,notes(version,report.sha256));
  if (args[0]==='--prepare') {
    console.log('Prepared '+version+'. Commit and push the changes and numeric tag, then run pnpm run release.');
    return;
  }
  const origin=run('git',['remote','get-url','origin'],{capture:true});
  const match=origin.match(/^(?:git@github\.com:|https:\/\/github\.com\/|ssh:\/\/git@github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?$/);
  assert(match,'origin must identify a GitHub repository');
  const repo=match[1];
  const create=['release','create',version,productionFilename,'--repo',repo,
    '--verify-tag','--title',version,'--notes-file',notesFile,'--latest'];
  if (args[0]==='--preview') {
    console.log(JSON.stringify({version,repo,sha256:report.sha256,notesFile,command:['gh',...create]},null,2));
    return;
  }
  assert.equal(run('git',['status','--porcelain'],{capture:true}),
    '','Commit all project changes before publishing');
  const head=run('git',['rev-parse','HEAD'],{capture:true});
  assert.equal(run('git',['rev-parse','refs/tags/'+version+'^{commit}'],{capture:true}),head,'Numeric tag must point to HEAD');
  const branch=run('git',['branch','--show-current'],{capture:true});
  assert(branch,'Publish from a branch with the release commit');
  const remote=run('git',['ls-remote','origin','refs/heads/'+branch,'refs/tags/'+version,'refs/tags/'+version+'^{}'],{capture:true});
  const refs=new Map(remote.split(/\r?\n/).filter(Boolean).map(line=>{const [sha,ref]=line.split(/\s+/);return [ref,sha];}));
  assert.equal(refs.get('refs/heads/'+branch),head,'Push the release commit before publishing');
  assert.equal(refs.get('refs/tags/'+version+'^{}') || refs.get('refs/tags/'+version),head,'Push the numeric tag before publishing');
  const localGh=path.join(root,'.local','github-cli','gh.exe');
  const gh=process.platform==='win32' && fs.existsSync(localGh)?localGh:'gh';
  const ghOptions={env:ghEnvironment()};
  run(gh,['auth','status','--hostname','github.com'],ghOptions);
  run(gh,create,ghOptions);
  run(gh,['release','view',version,'--repo',repo,'--json','url,tagName,isDraft,assets'],ghOptions);
}
module.exports={notes,main,ghEnvironment};
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
