import React from 'react';
import {createRoot} from 'react-dom/client';
import {GridCraftApp} from '../src/components/apps/gridcraft/GridCraftApp';
import * as service from '../src/services/gridcraftService';
import * as wordService from '../src/services/wordcraftService';
(window as any).gridFixture={service,wordService};
createRoot(document.getElementById('root')!).render(<GridCraftApp onBack={()=>{(window as any).wentBack=true;}}/>);
