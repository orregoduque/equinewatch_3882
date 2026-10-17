import React from 'react';
import {
    Activity, AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, Award, Baby, BarChart3, Battery, Bell, Building,
    Calendar, Camera, Check, CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardList, Clock,
    CreditCard, Crown, DollarSign, Download, Droplet, Edit, Eye, EyeOff, FileText, Globe, Headphones, Heart, HelpCircle,
    Home, Info, Lightbulb, Lock, LogOut, Mail, Moon, MoreVertical, Package, Pause, Plane, Play, Plus, RotateCcw, Search,
    Send, Share2, Shield, Smartphone, Stethoscope, Thermometer, Trash2, TrendingDown, TrendingUp, User, UserCheck,
    UserPlus, Users, Video, Wind, Wrench, X, Zap, type LucideProps
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
    Activity, AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, Award, Baby, BarChart3, Battery, Bell, Building,
    Calendar, Camera, Check, CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardList, Clock,
    CreditCard, Crown, DollarSign, Download, Droplet, Edit, Eye, EyeOff, FileText, Globe, Headphones, Heart, HelpCircle, Home, Info,
    Lightbulb, Lock, LogOut, Mail, Moon, MoreVertical, Package, Pause, Plane, Play, Plus, RotateCcw, Search, Send, Share2,
    Shield, Smartphone, Stethoscope, Thermometer, Trash2, TrendingDown, TrendingUp, User, UserCheck, UserPlus, Users,
    Video, Wind, Wrench, X, Zap,
};

interface IconProps extends Omit<LucideProps, 'size'> {
    name: string;
    size?: number;
    color?: string;
    className?: string;
    strokeWidth?: number;
}

function Icon({
    name,
    size = 24,
    color = "currentColor",
    className = "",
    strokeWidth = 2,
    ...props
}: IconProps) {
    const formattedName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    const IconComponent = iconMap[formattedName];

    if (!IconComponent) {
        return (
            <HelpCircle
                size={size}
                color="gray"
                strokeWidth={strokeWidth}
                className={className}
                {...props}
            />
        );
    }

    return (
        <IconComponent
            size={size}
            color={color}
            strokeWidth={strokeWidth}
            className={className}
            {...props}
        />
    );
}

export default Icon;