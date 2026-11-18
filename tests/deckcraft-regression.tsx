import React from 'react';
import {createRoot} from 'react-dom/client';
import {DeckCraftApp} from '../src/components/apps/deckcraft/DeckCraftApp';
import * as service from '../src/services/deckcraftService';
import * as gridService from '../src/services/gridcraftService';
(window as any).deckFixture={service,gridService};
createRoot(document.getElementById('root')!).render(<DeckCraftApp owner="regression" onBack={()=>{(window as any).wentBack=true;}}/>);
