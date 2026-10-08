<<<<<<< HEAD
import '../assets/style/layouts.css'
import '../assets/style/main.css'
import '../assets/style/style.css'
import '../assets/style/components.css'
import '../assets/style/responsive.css'

import SideBar from '../components/layout/SideBar/SideBar'
import Header from '../components/layout/Header/Header'
import { Outlet } from 'react-router-dom'
function MainLayout(){
    return(
        <>
         <div class="app-shell">
            <SideBar/>
            <div class="app-main">
                <Header/>
                <Outlet/>
            </div>
         </div>
        </>
    )
}
=======
import '../assets/style/layouts.css'
import '../assets/style/main.css'
import '../assets/style/style.css'
import '../assets/style/components.css'
import '../assets/style/responsive.css'

import SideBar from '../components/layout/SideBar/SideBar'
import Header from '../components/layout/Header/Header'
import { Outlet } from 'react-router-dom'
function MainLayout(){
    return(
        <>
         <div class="app-shell">
            <SideBar/>
            <div class="app-main">
                <Header/>
                <Outlet/>
            </div>
         </div>
        </>
    )
}
>>>>>>> 67953cc8b94ed89fa49feb0092c4d156a0f1ad36
export default MainLayout;