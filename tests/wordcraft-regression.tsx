import React from 'react';
import {createRoot} from 'react-dom/client';
import {WordCraftHome} from '../src/components/apps/wordcraft/WordCraftHome';
import * as service from '../src/services/wordcraftService';
(window as any).craftFixture={service};
createRoot(document.getElementById('root')!).render(<WordCraftHome onBack={()=>{(window as any).wentBack=true;}}/>);
