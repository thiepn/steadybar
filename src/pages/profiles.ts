import { activeProfile, definition, practiceProfiles, profiles } from '../domain/profiles.js';
import { store } from '../app/store.js';
import type { Page } from '../app/navigation.js';
import { profileManagement } from '../ui/profiles.js';
import { el } from '../ui/dom.js';
import { pageHeader, sectionHeader, stat } from '../ui/components.js';

export function profilesPage():Page{
  const data=store.snapshot(),selected=activeProfile(data),available=practiceProfiles(data),archived=profiles(data).filter(p=>p.archived),historical=profiles(data).filter(p=>p.attribution==='unresolved-history');
  const page=el('div',{class:'page profiles-page'},pageHeader('','Practice profiles','Separate instruments and practice contexts without splitting your workspace.'));
  page.append(el('div',{class:'stats-strip profile-stats'},
    stat('Selected',selected.name,definition(selected.instrumentType).label),
    stat('Available profiles',available.length,String(archived.length)+' archived'),
    stat('Practice focuses',selected.focusAreas.length,selected.focusAreas.join(' · ')||'Not set'),
    stat('Session preference',`${selected.defaultSessionMinutes} min`,selected.level)));
  page.append(profileManagement());
  if(historical.length)page.append(el('section',{class:'panel profile-history-note'},sectionHeader('Historical attribution'),el('p',{class:'muted small'},'Earlier practice is kept separately when an older session could not be assigned to an instrument safely. It remains visible in History but cannot be used as a new-practice profile.')));
  return {node:page};
}
