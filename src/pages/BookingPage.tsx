import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Video, Star, MapPin, Award, 
  ChevronLeft, ChevronRight, User, Shield, Heart,
  CreditCard, Lock, CheckCircle, AlertTriangle, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';

interface Therapist {
  id: string;
  name: string;
  title: string;
  specialization: string[];
  experience: number;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  location: string;
  avatar: string;
  verified: boolean;
  nextAvailable: string;
  bio: string;
  languages: string[];
  availability?: string[];
}

interface BookingStep {
  step: number;
  title: string;
  description: string;
}

interface PaymentData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

function BookingPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [sessionType, setSessionType] = useState<'video' | 'phone'>('video');
  const [sessionNotes, setSessionNotes] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: user?.name || '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    }
  });

  const [therapists, setTherapists] = useState<Therapist[]>([
    {
      id: '1',
      name: 'Dr. Sarah Smith',
      title: 'Licensed Clinical Psychologist',
      specialization: ['Anxiety', 'Depression', 'CBT'],
      experience: 8,
      rating: 4.9,
      reviewCount: 127,
      hourlyRate: 120,
      location: 'Online',
      avatar: 'https://images.pexels.com/photos/5327580/pexels-photo-5327580.jpeg?auto=compress&cs=tinysrgb&w=150',
      verified: true,
      nextAvailable: 'Today, 2:00 PM',
      bio: 'Experienced therapist specializing in CBT with a passion for helping patients overcome anxiety and depression.',
      languages: ['English', 'Spanish'],
      availability: [
        'Monday 9:00 AM', 'Monday 10:00 AM', 'Monday 11:00 AM', 'Monday 12:00 PM', 
        'Monday 1:00 PM', 'Monday 2:00 PM', 'Monday 3:00 PM', 'Monday 4:00 PM', 'Monday 5:00 PM',
        'Tuesday 9:00 AM', 'Tuesday 10:00 AM', 'Tuesday 11:00 AM', 'Tuesday 12:00 PM',
        'Tuesday 1:00 PM', 'Tuesday 2:00 PM', 'Tuesday 3:00 PM', 'Tuesday 4:00 PM', 'Tuesday 5:00 PM',
        'Wednesday 9:00 AM', 'Wednesday 10:00 AM', 'Wednesday 11:00 AM', 'Wednesday 12:00 PM',
        'Wednesday 1:00 PM', 'Wednesday 2:00 PM', 'Wednesday 3:00 PM', 'Wednesday 4:00 PM', 'Wednesday 5:00 PM',
        'Thursday 9:00 AM', 'Thursday 10:00 AM', 'Thursday 11:00 AM', 'Thursday 12:00 PM',
        'Thursday 1:00 PM', 'Thursday 2:00 PM', 'Thursday 3:00 PM', 'Thursday 4:00 PM', 'Thursday 5:00 PM',
        'Friday 9:00 AM', 'Friday 10:00 AM', 'Friday 11:00 AM', 'Friday 12:00 PM',
        'Friday 1:00 PM', 'Friday 2:00 PM', 'Friday 3:00 PM', 'Friday 4:00 PM', 'Friday 5:00 PM'
      ]
    }
  ]);

  const bookingSteps: BookingStep[] = [
    { step: 1, title: 'Select Therapist', description: 'Choose from our verified professionals' },
    { step: 2, title: 'Choose Date & Time', description: 'Pick your preferred appointment slot' },
    { step: 3, title: 'Session Details', description: 'Add notes and preferences' },
    { step: 4, title: 'Payment', description: 'Secure payment processing' },
    { step: 5, title: 'Confirmation', description: 'Booking confirmed' }
  ];

  useEffect(() => {
    // Load available therapists from localStorage
    const availableTherapists = localStorage.getItem('mindcare_therapists');
    if (availableTherapists) {
      const parsed = JSON.parse(availableTherapists);
      setTherapists(parsed);
    }
  }, []);

  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  const generateAvailableTimes = (date: string) => {
    if (!selectedTherapist?.availability) return [];
    
    const selectedDateObj = new Date(date);
    const dayName = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' });
    
    return selectedTherapist.availability
      .filter(slot => slot.startsWith(dayName))
      .map(slot => slot.split(' ')[1] + ' ' + slot.split(' ')[2]);
  };

  const handlePaymentInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setPaymentData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof PaymentData],
          [child]: value
        }
      }));
    } else {
      setPaymentData(prev => ({ ...prev, [field]: value }));
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const validatePaymentData = () => {
    const { cardNumber, expiryDate, cvv, cardholderName, billingAddress } = paymentData;
    
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      toast.error('Please enter a valid card number');
      return false;
    }
    
    if (!expiryDate || expiryDate.length < 5) {
      toast.error('Please enter a valid expiry date');
      return false;
    }
    
    if (!cvv || cvv.length < 3) {
      toast.error('Please enter a valid CVV');
      return false;
    }
    
    if (!cardholderName.trim()) {
      toast.error('Please enter the cardholder name');
      return false;
    }
    
    if (!billingAddress.street || !billingAddress.city || !billingAddress.state || !billingAddress.zipCode) {
      toast.error('Please complete the billing address');
      return false;
    }
    
    return true;
  };

  const processPayment = async () => {
    if (!validatePaymentData()) return;
    
    setIsProcessingPayment(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create booking after successful payment
      const booking = {
        id: Date.now().toString(),
        patientId: user?.id,
        patientName: user?.name,
        patientEmail: user?.email,
        therapistId: selectedTherapist?.id,
        therapistName: selectedTherapist?.name,
        date: selectedDate,
        time: selectedTime,
        sessionType,
        amount: `$${selectedTherapist?.hourlyRate}`,
        status: 'pending_confirmation',
        notes: sessionNotes,
        createdAt: new Date().toISOString(),
        paymentStatus: 'completed',
        paymentMethod: `**** **** **** ${paymentData.cardNumber.slice(-4)}`
      };

      // Save booking to localStorage
      const existingBookings = JSON.parse(localStorage.getItem('mindcare_bookings') || '[]');
      const updatedBookings = [...existingBookings, booking];
      localStorage.setItem('mindcare_bookings', JSON.stringify(updatedBookings));
      
      // Dispatch custom event for real-time updates
      window.dispatchEvent(new CustomEvent('mindcare-data-updated'));
      
      setCurrentStep(5);
      toast.success('Payment successful! Your session has been booked.');
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !selectedTherapist) {
      toast.error('Please select a therapist');
      return;
    }
    if (currentStep === 2 && (!selectedDate || !selectedTime)) {
      toast.error('Please select date and time');
      return;
    }
    if (currentStep === 4) {
      processPayment();
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const resetBooking = () => {
    setCurrentStep(1);
    setSelectedTherapist(null);
    setSelectedDate('');
    setSelectedTime('');
    setSessionNotes('');
    setPaymentData({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: user?.name || '',
      billingAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US'
      }
    });
  };

  return (
    <div className={`h-screen flex flex-col ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50'
    }`}>
      <div className="flex-1 overflow-y-auto p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <h1 className={`text-2xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            Book a Therapy Session
          </h1>
          <p className={`text-base ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Connect with licensed therapists for personalized support
          </p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`mb-6 p-4 rounded-xl shadow-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            {bookingSteps.map((step, index) => (
              <div key={step.step} className="flex items-center">
                <div className={`flex items-center space-x-3 ${
                  index < bookingSteps.length - 1 ? 'flex-1' : ''
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    currentStep >= step.step
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > step.step ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      step.step
                    )}
                  </div>
                  <div className="hidden md:block">
                    <h4 className={`text-sm font-semibold ${
                      currentStep >= step.step
                        ? theme === 'dark' ? 'text-white' : 'text-gray-800'
                        : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {step.title}
                    </h4>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < bookingSteps.length - 1 && (
                  <div className={`hidden md:block flex-1 h-px mx-4 ${
                    currentStep > step.step
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500'
                      : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-4"
            >
              <h2 className={`text-xl font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                Choose Your Therapist
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {therapists.map((therapist) => (
                  <motion.div
                    key={therapist.id}
                    whileHover={{ y: -5, scale: 1.02 }}
                    onClick={() => setSelectedTherapist(therapist)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                      selectedTherapist?.id === therapist.id
                        ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : theme === 'dark'
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : 'bg-white hover:shadow-lg'
                    } shadow-lg`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <img
                        src={therapist.avatar}
                        alt={therapist.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className={`font-semibold ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>
                            {therapist.name}
                          </h3>
                          {therapist.verified && (
                            <Shield className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {therapist.title}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>
                            {therapist.rating}
                          </span>
                          <span className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            ({therapist.reviewCount})
                          </span>
                        </div>
                        <span className={`text-sm font-semibold text-green-600`}>
                          ${therapist.hourlyRate}/session
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4 text-purple-500" />
                        <span className={`text-sm ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {therapist.experience} years experience
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {therapist.specialization.slice(0, 3).map((spec, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              theme === 'dark' ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className={`text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {therapist.bio.substring(0, 100)}...
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 2 && selectedTherapist && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-4"
            >
              <h2 className={`text-xl font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                Select Date & Time
              </h2>
              
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Date Selection */}
                <div className={`p-4 rounded-xl shadow-lg ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className={`text-lg font-semibold mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    Choose Date
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {generateAvailableDates().map((date) => (
                      <motion.button
                        key={date}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedDate(date)}
                        className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedDate === date
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <div className={`p-4 rounded-xl shadow-lg ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    <h3 className={`text-lg font-semibold mb-3 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      Available Times
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {generateAvailableTimes(selectedDate).map((time) => (
                        <motion.button
                          key={time}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedTime(time)}
                          className={`p-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            selectedTime === time
                              ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                              : theme === 'dark'
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {time}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-4"
            >
              <h2 className={`text-xl font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                Session Details
              </h2>
              
              <div className={`p-4 rounded-xl shadow-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Session Type
                    </label>
                    <div className="flex space-x-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSessionType('video')}
                        className={`flex-1 p-3 rounded-lg font-medium transition-all duration-200 ${
                          sessionType === 'video'
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Video className="w-5 h-5 mx-auto mb-1" />
                        Video Call
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSessionType('phone')}
                        className={`flex-1 p-3 rounded-lg font-medium transition-all duration-200 ${
                          sessionType === 'phone'
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                            : theme === 'dark'
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Clock className="w-5 h-5 mx-auto mb-1" />
                        Phone Call
                      </motion.button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Session Notes (Optional)
                    </label>
                    <textarea
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      rows={4}
                      placeholder="Share what you'd like to focus on in this session..."
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-4"
            >
              <h2 className={`text-xl font-semibold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                Payment Information
              </h2>

              {/* Booking Summary */}
              <div className={`p-4 rounded-xl shadow-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <h3 className={`text-lg font-semibold mb-3 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  Booking Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      Therapist:
                    </span>
                    <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                      {selectedTherapist?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      Date & Time:
                    </span>
                    <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                      {new Date(selectedDate).toLocaleDateString()} at {selectedTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      Session Type:
                    </span>
                    <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                      {sessionType === 'video' ? 'Video Call' : 'Phone Call'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      Total:
                    </span>
                    <span className="font-bold text-green-600 text-lg">
                      ${selectedTherapist?.hourlyRate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className={`p-4 rounded-xl shadow-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="flex items-center space-x-2 mb-4">
                  <Lock className="w-5 h-5 text-green-500" />
                  <h3 className={`text-lg font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    Secure Payment
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Card Number */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Card Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={paymentData.cardNumber}
                        onChange={(e) => handlePaymentInputChange('cardNumber', formatCardNumber(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className={`w-full px-4 py-3 pl-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <CreditCard className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                    </div>
                  </div>

                  {/* Expiry and CVV */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        value={paymentData.expiryDate}
                        onChange={(e) => handlePaymentInputChange('expiryDate', formatExpiryDate(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        CVV
                      </label>
                      <input
                        type="text"
                        value={paymentData.cvv}
                        onChange={(e) => handlePaymentInputChange('cvv', e.target.value.replace(/\D/g, '').substring(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={paymentData.cardholderName}
                      onChange={(e) => handlePaymentInputChange('cardholderName', e.target.value)}
                      placeholder="John Doe"
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>

                  {/* Billing Address */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Billing Address
                    </label>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={paymentData.billingAddress.street}
                        onChange={(e) => handlePaymentInputChange('billingAddress.street', e.target.value)}
                        placeholder="Street Address"
                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={paymentData.billingAddress.city}
                          onChange={(e) => handlePaymentInputChange('billingAddress.city', e.target.value)}
                          placeholder="City"
                          className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                        <input
                          type="text"
                          value={paymentData.billingAddress.state}
                          onChange={(e) => handlePaymentInputChange('billingAddress.state', e.target.value)}
                          placeholder="State"
                          className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            theme === 'dark'
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </div>
                      <input
                        type="text"
                        value={paymentData.billingAddress.zipCode}
                        onChange={(e) => handlePaymentInputChange('billingAddress.zipCode', e.target.value.replace(/\D/g, '').substring(0, 5))}
                        placeholder="ZIP Code"
                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className={`p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-green-500" />
                      <span className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-green-300' : 'text-green-700'
                      }`}>
                        Your payment information is encrypted and secure
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <div className={`max-w-md mx-auto p-6 rounded-xl shadow-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className={`text-2xl font-bold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  Booking Confirmed!
                </h2>
                <p className={`mb-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Your therapy session has been successfully booked and paid for. You'll receive a confirmation email shortly.
                </p>
                
                <div className={`p-4 rounded-lg mb-6 ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Therapist:
                      </span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                        {selectedTherapist?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Date & Time:
                      </span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                        {new Date(selectedDate).toLocaleDateString()} at {selectedTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Amount Paid:
                      </span>
                      <span className="font-bold text-green-600">
                        ${selectedTherapist?.hourlyRate}
                      </span>
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetBooking}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Book Another Session
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        {currentStep < 5 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between mt-6"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                currentStep === 1
                  ? 'opacity-50 cursor-not-allowed'
                  : theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={nextStep}
              disabled={isProcessingPayment}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessingPayment ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>
                    {currentStep === 4 ? 'Pay & Book Session' : 'Next'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default BookingPage;