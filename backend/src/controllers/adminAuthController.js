const jwt = require("jsonwebtoken");

exports.adminLogin = (req, res) => {
    try {
        const { email, password } = req.body;

        console.log("Admin login attempt:", { email });

        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password"
            });
        }

        // Check admin credentials from environment variables
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {

            // Create token
            const token = jwt.sign(
                {
                    role: "admin",
                    email: email,
                    isAdmin: true
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: process.env.JWT_EXPIRE || "1d"
                }
            );

            // Send response
            return res.json({
                success: true,
                message: "Admin logged in successfully",
                token: token,
                data: {
                    role: "admin",
                    email: email,
                    fullName: "Administrator"
                }
            });
        }

        // If credentials are wrong
        return res.status(401).json({
            success: false,
            message: "Invalid admin credentials"
        });

    } catch (error) {
        console.error("Admin login error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during admin login"
        });
    }
};