import {Link} from "react-router";
import {usePuterStore} from "~/lib/puter";

const Navbar = () => {
    const { auth } = usePuterStore();

    return (
        <nav className="navbar">
            <Link to="/">
                <p className="text-2xl font-bold text-gradient">RESUMIND</p>
            </Link>
            <div className="flex items-center gap-4">
                <Link to="/upload" className="primary-button w-fit">
                    Upload Resume
                </Link>
                {auth.isAuthenticated && (
                    <button
                        onClick={auth.signOut}
                        className="text-gray-500 hover:text-gray-800 text-sm font-medium"
                    >
                        Log Out
                    </button>
                )}
            </div>
        </nav>
    )
}
export default Navbar