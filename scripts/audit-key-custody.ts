import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/** Audit signing keys belong to the invoking custodian and SYSTEM on Windows. */
export function protectAuditKeyLocation(path: string) {
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (lstatSync(directory).isSymbolicLink() || (existsSync(path) && lstatSync(path).isSymbolicLink())) throw new Error('Audit key custody refuses a linked key location');
  if (process.platform !== 'win32') {
    chmodSync(directory, 0o700); if (existsSync(path)) chmodSync(path, 0o600); return;
  }
  // Remove inherited and explicit grants, preserving the existing owner/group.
  // The path is passed as environment data, never interpolated into executable text.
  const command = `$ErrorActionPreference='Stop';
    $user=[System.Security.Principal.WindowsIdentity]::GetCurrent().User;
    $system=[System.Security.Principal.SecurityIdentifier]::new('S-1-5-18');
    $paths=@($env:ORVIA_AUDIT_KEY_DIRECTORY);
    if(Test-Path -LiteralPath $env:ORVIA_AUDIT_KEY_FILE){$paths+=@($env:ORVIA_AUDIT_KEY_FILE)};
    foreach($target in $paths){
      $isDirectory=(Get-Item -LiteralPath $target).PSIsContainer;
      $acl=Get-Acl -LiteralPath $target;
      if($isDirectory){$inherit=[System.Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'}
      else{$inherit=[System.Security.AccessControl.InheritanceFlags]::None};
      $acl.SetAccessRuleProtection($true,$false);
      foreach($existing in @($acl.Access)){$acl.PurgeAccessRules($existing.IdentityReference)};
      foreach($sid in @($user,$system)){$acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl',$inherit,'None','Allow'))};
      if($isDirectory){[System.IO.Directory]::SetAccessControl($target,$acl)}
      else{[System.IO.File]::SetAccessControl($target,$acl)};
    }`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    windowsHide: true, stdio: 'pipe', env: { ...process.env, ORVIA_AUDIT_KEY_DIRECTORY: directory, ORVIA_AUDIT_KEY_FILE: path },
  });
  if (result.error) throw new Error('Audit key custody command could not start; no key is generated', { cause: result.error });
  if (result.status !== 0) {
    const category=String(result.stderr??'').match(/FullyQualifiedErrorId\s*:\s*([^\r\n]+)/)?.[1]??'UNKNOWN';
    // Preserve the failure category/status without retaining command output or a private key location.
    throw new Error(`Audit key custody permissions could not be established (${category}); no key is generated`, {
      cause: { category, status: result.status, signal: result.signal },
    });
  }
}
